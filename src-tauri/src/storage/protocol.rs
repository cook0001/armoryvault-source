use std::fs;
use std::path::{Path, PathBuf};
use tauri::http::{header, Request, Response, StatusCode};

pub struct LocalFileProtocol;

impl LocalFileProtocol {
    /// Determines MIME type from file extension
    fn guess_mime(path: &Path) -> &'static str {
        match path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
            .as_deref()
        {
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("png") => "image/png",
            Some("webp") => "image/webp",
            Some("gif") => "image/gif",
            Some("svg") => "image/svg+xml",
            Some("bmp") => "image/bmp",
            Some("ico") => "image/x-icon",
            Some("pdf") => "application/pdf",
            _ => "application/octet-stream",
        }
    }

    /// Resolves the raw URI into a canonical filesystem PathBuf and thumbnail boolean flag
    pub fn resolve_file_path(uri: &tauri::http::Uri) -> (PathBuf, bool) {
        let uri_str = uri.to_string();
        let is_thumb = uri_str.contains("thumb=1")
            || uri.query().is_some_and(|q| q.contains("thumb=1"));

        // Strip query string
        let path_part = uri_str.split('?').next().unwrap_or(&uri_str);

        // Repeatedly strip local-file:, file:, and leading slashes to handle chained prefixes
        // like local-file://file:///Users/... that occur in legacy databases
        let mut cleaned = path_part;
        loop {
            if let Some(rest) = cleaned.strip_prefix("local-file:") {
                cleaned = rest;
            } else if let Some(rest) = cleaned.strip_prefix("file:") {
                cleaned = rest;
            } else if let Some(rest) = cleaned.strip_prefix("//localhost/") {
                cleaned = rest;
            } else if let Some(rest) = cleaned.strip_prefix("//localhost") {
                cleaned = rest;
            } else if let Some(rest) = cleaned.strip_prefix('/') {
                cleaned = rest;
            } else {
                break;
            }
        }

        // Percent decode spaces and special characters
        let decoded = percent_encoding::percent_decode_str(cleaned)
            .decode_utf8_lossy()
            .to_string();

        #[cfg(not(target_os = "windows"))]
        let target = PathBuf::from(format!("/{}", decoded));

        #[cfg(target_os = "windows")]
        let target = PathBuf::from(decoded);

        (target, is_thumb)
    }

    /// Primary handler for local-file:// requests from WebKit
    pub fn handle_request(req: Request<Vec<u8>>) -> Response<Vec<u8>> {
        // Handle preflight OPTIONS requests
        if req.method() == "OPTIONS" {
            return Response::builder()
                .status(StatusCode::NO_CONTENT)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
                .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "*")
                .body(Vec::new())
                .unwrap();
        }

        let (target_path, is_thumb) = Self::resolve_file_path(req.uri());

        let final_path = if is_thumb {
            if let (Some(parent), Some(file_name)) = (target_path.parent(), target_path.file_name())
            {
                let thumb_name = format!("thumb_{}", file_name.to_string_lossy());
                let thumb_path = parent.join(&thumb_name);
                if thumb_path.exists() {
                    thumb_path
                } else if target_path.exists() {
                    // Generate thumbnail on the fly using pure-Rust `image` crate
                    if let Ok(img) = image::open(&target_path) {
                        let thumb = img.thumbnail(200, 200);
                        let _ = thumb.save(&thumb_path);
                        if thumb_path.exists() {
                            thumb_path
                        } else {
                            target_path
                        }
                    } else {
                        target_path
                    }
                } else {
                    target_path
                }
            } else {
                target_path
            }
        } else {
            target_path
        };

        if !final_path.exists() {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(header::CONTENT_TYPE, "text/plain")
                .body(format!("File not found: {:?}", final_path).into_bytes())
                .unwrap();
        }

        match fs::read(&final_path) {
            Ok(data) => {
                let mime = Self::guess_mime(&final_path);
                Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, mime)
                    .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .header(header::CACHE_CONTROL, "public, max-age=86400")
                    .body(data)
                    .unwrap()
            }
            Err(e) => Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(header::CONTENT_TYPE, "text/plain")
                .body(format!("Failed to read file: {}", e).into_bytes())
                .unwrap(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uri_variants() {
        let u1 = "local-file://localhost/Users/danielc/photos/firearm_1.jpeg".parse::<tauri::http::Uri>();
        assert!(u1.is_ok(), "localhost with 2 slashes");

        let u2 = "local-file:/Users/danielc/photos/firearm_1.jpeg".parse::<tauri::http::Uri>();
        println!("u2 result: {:?}", u2);

        let u3 = "/Users/danielc/photos/firearm_1.jpeg".parse::<tauri::http::Uri>();
        assert!(u3.is_ok(), "path only");
    }

    #[test]
    fn test_resolve_localhost_uri() {
        let uri: tauri::http::Uri = "local-file://localhost/Users/danielc/photos/firearm_1.jpeg?thumb=1"
            .parse()
            .unwrap();
        let (path, is_thumb) = LocalFileProtocol::resolve_file_path(&uri);
        assert_eq!(
            path,
            PathBuf::from("/Users/danielc/photos/firearm_1.jpeg")
        );
        assert!(is_thumb);
    }

    #[test]
    fn test_resolve_percent_encoded_localhost_uri() {
        let uri: tauri::http::Uri = "local-file://localhost/Users/danielc/Library/Application%20Support/ArmoryVault/photos/firearm_1.jpeg?thumb=1"
            .parse()
            .unwrap();
        let (path, is_thumb) = LocalFileProtocol::resolve_file_path(&uri);
        assert_eq!(
            path,
            PathBuf::from("/Users/danielc/Library/Application Support/ArmoryVault/photos/firearm_1.jpeg")
        );
        assert!(is_thumb);
    }

    #[test]
    fn test_guess_mime() {
        assert_eq!(LocalFileProtocol::guess_mime(Path::new("pic.jpg")), "image/jpeg");
        assert_eq!(LocalFileProtocol::guess_mime(Path::new("pic.jpeg")), "image/jpeg");
        assert_eq!(LocalFileProtocol::guess_mime(Path::new("pic.png")), "image/png");
        assert_eq!(LocalFileProtocol::guess_mime(Path::new("pic.webp")), "image/webp");
        assert_eq!(LocalFileProtocol::guess_mime(Path::new("doc.pdf")), "application/pdf");
    }
}
