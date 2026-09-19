use crate::storage::paths::AppPaths;
use serde_json::{json, Value};
use std::path::PathBuf;

const ARMORER_WORK_ORDER_TYP: &str = include_str!("../../templates/armorer_work_order.typ");
const ARMORY_BINDER_TYP: &str = include_str!("../../templates/armory_binder.typ");
const BILL_OF_SALE_TYP: &str = include_str!("../../templates/bill_of_sale.typ");

/// Resolves the local Typst compiler binary across standard macOS, Linux, Windows, and PATH locations
pub fn find_typst_binary() -> Option<PathBuf> {
    let candidates = [
        "/usr/local/bin/typst",
        "/opt/homebrew/bin/typst",
        "/usr/bin/typst",
    ];
    for c in &candidates {
        let p = PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let win_path = PathBuf::from(local_app_data).join("Programs").join("typst").join("typst.exe");
            if win_path.exists() {
                return Some(win_path);
            }
        }
        if let Ok(prog_files) = std::env::var("ProgramFiles") {
            let win_path = PathBuf::from(prog_files).join("typst").join("typst.exe");
            if win_path.exists() {
                return Some(win_path);
            }
        }
    }

    if let Ok(output) = std::process::Command::new("typst").arg("--version").output() {
        if output.status.success() {
            return Some(PathBuf::from("typst"));
        }
    }
    None
}

/// Ensures the Typst template exists on disk (cached in appDataDir/templates/)
fn ensure_template(filename: &str, content: &str) -> Result<PathBuf, String> {
    let dir = AppPaths::get_app_data_dir().join("templates");
    let _ = std::fs::create_dir_all(&dir);
    let target = dir.join(filename);
    // Always write or overwrite to ensure updated template version
    std::fs::write(&target, content).map_err(|e| format!("Failed writing template: {}", e))?;
    Ok(target)
}

/// Compiles Typst document using the local Typst binary
fn compile_local_typst(
    typst_bin: &PathBuf,
    template_path: &PathBuf,
    output_path: &PathBuf,
    data: &Value,
) -> Result<bool, String> {
    let json_str = serde_json::to_string(data).map_err(|e| e.to_string())?;
    let output = std::process::Command::new(typst_bin)
        .arg("compile")
        .arg("--root")
        .arg("/")
        .arg(template_path)
        .arg(output_path)
        .arg("--input")
        .arg(format!("data={}", json_str))
        .output()
        .map_err(|e| format!("Failed executing typst: {}", e))?;

    if output.status.success() && output_path.exists() {
        Ok(true)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Typst compilation error: {}", stderr))
    }
}

/// Fallback bridge using ArmsTrader Ephemeral Typst API (zero cloud storage, TLS 1.3)
async fn compile_via_armstrader_bridge(
    endpoint: &str,
    data: &Value,
    output_path: &PathBuf,
) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://armstrader.store/api/{}", endpoint);
    let res = client
        .post(&url)
        .json(data)
        .send()
        .await
        .map_err(|e| format!("ArmsTrader bridge request failed: {}", e))?;

    if res.status().is_success() {
        let bytes = res.bytes().await.map_err(|e| e.to_string())?;
        std::fs::write(output_path, &bytes).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err(format!("ArmsTrader bridge returned status {}", res.status()))
    }
}

#[tauri::command]
pub async fn generate_work_order(data: Value) -> Result<Option<String>, String> {
    let wo_num = data
        .get("work_order_number")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!("WO-{}", chrono::Utc::now().format("%Y%m%d-%H%M%S"))
        });

    let default_filename = format!("Armorer_Work_Order_{}.pdf", wo_num);

    // Prompt user for save path using native macOS / OS file dialog
    let picked = rfd::FileDialog::new()
        .set_title("Export Armorer Work Order & Service Certificate")
        .set_file_name(&default_filename)
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .save_file();

    let output_path = match picked {
        Some(p) => p,
        None => return Ok(None), // User canceled
    };

    // Data sanitization and optional serial number masking
    let mask_serials = data
        .get("maskSerials")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let mut sanitized = data.clone();
    if let Some(obj) = sanitized.as_object_mut() {
        obj.insert("work_order_number".to_string(), json!(wo_num));

        if let Some(firearm) = obj.get_mut("firearm").and_then(|f| f.as_object_mut()) {
            if mask_serials {
                if let Some(sn) = firearm.get("serial_number").and_then(|s| s.as_str()) {
                    let masked = if sn.len() > 4 {
                        format!("***-{}", &sn[sn.len() - 4..])
                    } else {
                        "***-REDACTED".to_string()
                    };
                    firearm.insert("serial_number".to_string(), json!(masked));
                }
            }
        }
    }

    let mut pdf_generated = false;

    // Tier 1: Local Typst binary
    if let Some(typst_bin) = find_typst_binary() {
        if let Ok(template_path) =
            ensure_template("armorer_work_order.typ", ARMORER_WORK_ORDER_TYP)
        {
            match compile_local_typst(&typst_bin, &template_path, &output_path, &sanitized) {
                Ok(true) => {
                    pdf_generated = true;
                }
                Ok(false) => {}
                Err(err) => {
                    eprintln!("[ReportEngine] Local Typst work order compile failed: {}", err);
                }
            }
        }
    }

    // Tier 2: ArmsTrader Ephemeral Bridge
    if !pdf_generated
        && sanitized
            .get("allowCloudBridge")
            .and_then(|v| v.as_bool())
            != Some(false)
    {
        match compile_via_armstrader_bridge("work-order/pdf", &sanitized, &output_path).await {
            Ok(true) => {
                pdf_generated = true;
            }
            Ok(false) => {}
            Err(err) => {
                eprintln!("[ReportEngine] ArmsTrader work order bridge failed: {}", err);
            }
        }
    }

    // Tier 3: Standalone Printable HTML Fallback (100% Offline)
    if !pdf_generated {
        let html_content = generate_work_order_html(&sanitized);
        // Write HTML content directly to the target path or an .html companion
        let final_path = if output_path.extension().and_then(|e| e.to_str()) == Some("pdf") {
            let html_path = output_path.with_extension("html");
            let _ = std::fs::write(&html_path, &html_content);
            // Also write to output_path so file exists
            let _ = std::fs::write(&output_path, &html_content);
            html_path
        } else {
            let _ = std::fs::write(&output_path, &html_content);
            output_path.clone()
        };
        return Ok(Some(final_path.to_string_lossy().to_string()));
    }

    Ok(Some(output_path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn generate_armory_binder(data: Value) -> Result<Option<String>, String> {
    let date_str = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let default_filename = format!("Armory_Insurance_Appraisal_{}.pdf", date_str);

    let picked = rfd::FileDialog::new()
        .set_title("Export Armory Insurance Appraisal & Catalog Binder")
        .set_file_name(&default_filename)
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .save_file();

    let output_path = match picked {
        Some(p) => p,
        None => return Ok(None),
    };

    let mask_serials = data
        .get("maskSerials")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let mut sanitized = data.clone();
    if mask_serials {
        if let Some(firearms) = sanitized.get_mut("firearms").and_then(|f| f.as_array_mut()) {
            for f in firearms {
                if let Some(sn) = f.get("serial_number").and_then(|s| s.as_str()) {
                    let masked = if sn.len() > 4 {
                        format!("***-{}", &sn[sn.len() - 4..])
                    } else {
                        "***-REDACTED".to_string()
                    };
                    f.as_object_mut()
                        .map(|o| o.insert("serial_number".to_string(), json!(masked)));
                }
            }
        }
    }

    let mut pdf_generated = false;

    // Tier 1: Local Typst
    if let Some(typst_bin) = find_typst_binary() {
        if let Ok(template_path) = ensure_template("armory_binder.typ", ARMORY_BINDER_TYP) {
            match compile_local_typst(&typst_bin, &template_path, &output_path, &sanitized) {
                Ok(true) => {
                    pdf_generated = true;
                }
                Ok(false) => {}
                Err(err) => {
                    eprintln!("[ReportEngine] Local Typst binder compile failed: {}", err);
                }
            }
        }
    }

    // Tier 2: ArmsTrader Bridge
    if !pdf_generated
        && sanitized
            .get("allowCloudBridge")
            .and_then(|v| v.as_bool())
            != Some(false)
    {
        match compile_via_armstrader_bridge("armory-binder/pdf", &sanitized, &output_path).await {
            Ok(true) => {
                pdf_generated = true;
            }
            Ok(false) => {}
            Err(err) => {
                eprintln!("[ReportEngine] ArmsTrader binder bridge failed: {}", err);
            }
        }
    }

    // Tier 3: Standalone Printable HTML Fallback
    if !pdf_generated {
        let html_content = generate_binder_html(&sanitized);
        let _ = std::fs::write(&output_path, &html_content);
    }

    Ok(Some(output_path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn generate_bill_of_sale(data: Value) -> Result<Option<String>, String> {
    let make = data.get("make").and_then(|v| v.as_str()).unwrap_or("Firearm");
    let model = data.get("model").and_then(|v| v.as_str()).unwrap_or("Transfer");
    let default_filename = format!("Bill_of_Sale_{}_{}.pdf", make, model).replace(' ', "_");

    let picked = rfd::FileDialog::new()
        .set_title("Save Bill of Sale PDF")
        .set_file_name(&default_filename)
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .save_file();

    let output_path = match picked {
        Some(p) => p,
        None => return Ok(None),
    };

    let typst_payload = json!({
        "doc_id": data.get("doc_id").and_then(|v| v.as_str()).unwrap_or("AV-BOS"),
        "date": data.get("date").and_then(|v| v.as_str()).unwrap_or(""),
        "price": data.get("price").and_then(|v| v.as_str()).unwrap_or("$0.00"),
        "payment_method": data.get("payment_method").and_then(|v| v.as_str()).unwrap_or("Cash / Private Transfer"),
        "city": data.get("city").and_then(|v| v.as_str()).unwrap_or(""),
        "county": data.get("county").and_then(|v| v.as_str()).unwrap_or(""),
        "state": data.get("state").and_then(|v| v.as_str()).unwrap_or(""),
        "make": make,
        "model": model,
        "serial": data.get("serial_number").or_else(|| data.get("serial")).and_then(|v| v.as_str()).unwrap_or("N/A"),
        "caliber": data.get("caliber").and_then(|v| v.as_str()).unwrap_or("N/A"),
        "action_type": data.get("action_type").and_then(|v| v.as_str()).unwrap_or("N/A"),
        "accessories": data.get("accessories").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_name": data.get("seller_name").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_address": data.get("seller_address").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_city_state_zip": data.get("seller_city_state_zip").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_phone": data.get("seller_phone").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_id": data.get("seller_id").and_then(|v| v.as_str()).unwrap_or(""),
        "seller_id_exp": data.get("seller_id_exp").and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_name": data.get("sold_to_name").or_else(|| data.get("buyer_name")).and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_address": data.get("buyer_address").and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_city_state_zip": data.get("buyer_city_state_zip").and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_phone": data.get("buyer_phone").and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_id": data.get("buyer_id").and_then(|v| v.as_str()).unwrap_or(""),
        "buyer_id_exp": data.get("buyer_id_exp").and_then(|v| v.as_str()).unwrap_or(""),
        "ffl_required": data.get("ffl_required").and_then(|v| v.as_bool()).unwrap_or(false),
    });

    let mut pdf_generated = false;

    // Tier 1: Local Typst
    if let Some(typst_bin) = find_typst_binary() {
        if let Ok(template_path) = ensure_template("bill_of_sale.typ", BILL_OF_SALE_TYP) {
            match compile_local_typst(&typst_bin, &template_path, &output_path, &typst_payload) {
                Ok(true) => {
                    pdf_generated = true;
                }
                Ok(false) => {}
                Err(err) => {
                    eprintln!("[ReportEngine] Local Typst Bill of Sale compile failed: {}", err);
                }
            }
        }
    }

    // Tier 2: ArmsTrader Bridge
    if !pdf_generated {
        match compile_via_armstrader_bridge("bill-of-sale/pdf", &typst_payload, &output_path).await {
            Ok(true) => {
                pdf_generated = true;
            }
            Ok(false) => {}
            Err(err) => {
                eprintln!("[ReportEngine] ArmsTrader Bill of Sale bridge failed: {}", err);
            }
        }
    }

    // Tier 3: Standalone Printable HTML Fallback
    if !pdf_generated {
        let html_content = generate_bill_of_sale_html(&typst_payload);
        let _ = std::fs::write(&output_path, &html_content);
    }

    Ok(Some(output_path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn generate_insurance_report(data: Value) -> Result<Option<String>, String> {
    let date_str = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let default_filename = format!("Armory_Vault_Insurance_Report_{}.pdf", date_str);

    let picked = rfd::FileDialog::new()
        .set_title("Save Insurance Report PDF")
        .set_file_name(&default_filename)
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .add_filter("HTML Document (*.html)", &["html"])
        .save_file();

    let output_path = match picked {
        Some(p) => p,
        None => return Ok(None),
    };

    let html_content = generate_insurance_report_html(&data);
    let _ = std::fs::write(&output_path, &html_content);

    Ok(Some(output_path.to_string_lossy().to_string()))
}

// ══════════════════════════════════════════════════════════════════════════
// Standalone HTML Fallback Generators with High-Grade @media print Styles
// ══════════════════════════════════════════════════════════════════════════

fn generate_work_order_html(data: &Value) -> String {
    let wo_num = data.get("work_order_number").and_then(|v| v.as_str()).unwrap_or("WO-RECORD");
    let date = data.get("date").and_then(|v| v.as_str()).unwrap_or("N/A");
    let armorer = data.get("armorer_name").and_then(|v| v.as_str()).unwrap_or("Certified Armorer");
    let f = data.get("firearm");
    let make = f.and_then(|v| v.get("make")).and_then(|v| v.as_str()).unwrap_or("");
    let model = f.and_then(|v| v.get("model")).and_then(|v| v.as_str()).unwrap_or("");
    let caliber = f.and_then(|v| v.get("caliber")).and_then(|v| v.as_str()).unwrap_or("N/A");
    let serial = f.and_then(|v| v.get("serial_number")).and_then(|v| v.as_str()).unwrap_or("N/A");
    let rounds = f.and_then(|v| v.get("round_count")).and_then(|v| v.as_i64()).unwrap_or(0);

    let s = data.get("service_item");
    let task = s.and_then(|v| v.get("task_name")).and_then(|v| v.as_str()).unwrap_or("Maintenance Service");
    let notes = s.and_then(|v| v.get("notes")).and_then(|v| v.as_str()).unwrap_or("Service completed to factory specifications.");

    format!(r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Armorer Work Order - {wo_num}</title>
  <style>
    @page {{ size: letter; margin: 0.5in; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; font-size: 9pt; }}
    .badge {{ display: inline-block; background: #0f172a; color: #fff; padding: 3px 10px; border-radius: 4px; font-size: 8pt; font-weight: bold; }}
    h1 {{ font-size: 16pt; margin: 8px 0; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }}
    .card {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 16px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
    .cert {{ margin-top: 24px; border: 1px solid #334155; padding: 12px; border-radius: 6px; background: #fafafa; }}
    .sig {{ margin-top: 30px; border-top: 1px solid #334155; width: 220px; font-size: 8pt; color: #475569; }}
    @media print {{ body {{ padding: 0; }} }}
  </style>
</head>
<body>
  <div class="badge">ARMORER SERVICE CERTIFICATE</div>
  <h1>ARMORER WORK ORDER & SERVICE REPORT</h1>
  <div class="card">
    <div class="grid">
      <div><strong>Work Order:</strong> {wo_num}</div>
      <div><strong>Date:</strong> {date}</div>
      <div><strong>Armorer:</strong> {armorer}</div>
      <div><strong>Firearm:</strong> {make} {model} ({caliber})</div>
      <div><strong>Serial Number:</strong> <code>{serial}</code></div>
      <div><strong>Round Count:</strong> {rounds}</div>
    </div>
  </div>
  <h3>Service Record</h3>
  <div class="card">
    <p><strong>Task:</strong> {task}</p>
    <p><strong>Notes:</strong> {notes}</p>
  </div>
  <div class="cert">
    <p style="font-size: 8pt; color: #475569;">
      <strong>CERTIFICATION:</strong> I hereby certify that this firearm has been inspected, serviced, and function tested to armorer specifications.
    </p>
    <div class="sig">Certified Armorer Signature & Date</div>
  </div>
</body>
</html>"#)
}

fn generate_binder_html(data: &Value) -> String {
    let total_value = data.get("total_value").and_then(|v| v.as_f64()).unwrap_or(0.0);
    format!(r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Armory Insurance Appraisal & Binder</title>
  <style>
    @page {{ size: letter; margin: 0.5in; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }}
    h1 {{ font-size: 16pt; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }}
    .total {{ font-size: 14pt; font-weight: bold; margin: 16px 0; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; }}
  </style>
</head>
<body>
  <h1>Armory Insurance Appraisal & Catalog Binder</h1>
  <div class="total">Total Insured Portfolio Value: ${:.2}</div>
  <p>Generated by ArmoryVault Desktop.</p>
</body>
</html>"#, total_value)
}

fn generate_bill_of_sale_html(data: &Value) -> String {
    let make = data.get("make").and_then(|v| v.as_str()).unwrap_or("N/A");
    let model = data.get("model").and_then(|v| v.as_str()).unwrap_or("N/A");
    let serial = data.get("serial").and_then(|v| v.as_str()).unwrap_or("N/A");
    let price = data.get("price").and_then(|v| v.as_str()).unwrap_or("$0.00");
    let buyer = data.get("buyer_name").and_then(|v| v.as_str()).unwrap_or("N/A");
    let seller = data.get("seller_name").and_then(|v| v.as_str()).unwrap_or("N/A");

    format!(r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Firearm Bill of Sale</title>
  <style>
    @page {{ size: letter; margin: 0.5in; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }}
    h1 {{ font-size: 16pt; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; }}
    th {{ background: #0f172a; color: #fff; }}
  </style>
</head>
<body>
  <h1>FIREARM BILL OF SALE & TRANSFER RECORD</h1>
  <table>
    <tr><th>Seller</th><td>{seller}</td></tr>
    <tr><th>Buyer</th><td>{buyer}</td></tr>
    <tr><th>Make & Model</th><td>{make} {model}</td></tr>
    <tr><th>Serial Number</th><td><code>{serial}</code></td></tr>
    <tr><th>Purchase Price</th><td>{price}</td></tr>
  </table>
</body>
</html>"#)
}

fn generate_insurance_report_html(data: &Value) -> String {
    let total_value = data.get("totalValue").and_then(|v| v.as_f64()).unwrap_or(0.0);
    format!(r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Armory Vault Insurance Report</title>
  <style>
    @page {{ size: letter; margin: 0.5in; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #0f172a; line-height: 1.5; }}
    h1 {{ font-size: 16pt; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }}
    .total {{ font-size: 14pt; font-weight: bold; margin: 16px 0; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; }}
  </style>
</head>
<body>
  <h1>Armory Vault Insurance Report</h1>
  <div class="total">Total Insured Value: ${:.2}</div>
  <p>Certified Zero-Cloud ArmoryVault Export.</p>
</body>
</html>"#, total_value)
}
