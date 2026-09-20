export interface EulaSection {
  title: string;
  content: string;
}

export const EULA_METADATA = {
  appName: 'ArmoryVault',
  edition: 'Desktop Native Edition',
  licenseModel: 'Proprietary Freeware (Free for Personal Use)',
  copyright: 'Copyright (c) 2026 Daniel Cook (cook0001) / ArmoryVault. All Rights Reserved.',
  summary:
    'ArmoryVault is proprietary freeware provided free of charge for individual personal, non-commercial firearms inventory, reloading management, and ballistics calculations. All rights not expressly granted are reserved. User data remains 100% private, sovereign, and local.',
};

export const EULA_SECTIONS: EulaSection[] = [
  {
    title: '1. License Grant (Free for Personal Use)',
    content:
      'Subject to the terms and conditions of this Agreement, Daniel Cook ("Licensor") grants you a personal, revocable, non-exclusive, non-transferable, royalty-free license to download, install, and execute the binary and executable forms of the Software on devices owned or controlled by you, solely for your individual, personal, and non-commercial firearms inventory, reloading management, and ballistics calculations ("Permitted Purpose").',
  },
  {
    title: '2. Proprietary Rights & Closed-Source Standard',
    content:
      'The Software, including its source code, object code, design, logos, user interfaces, documentation, and underlying algorithms, is proprietary intellectual property owned exclusively by the Licensor and is protected by United States and international copyright, trade secret, and intellectual property laws.\n\nThis Software is NOT open source. No source code license is granted or implied. All rights not expressly granted to you under Section 1 of this Agreement are strictly reserved by the Licensor.',
  },
  {
    title: '3. Restrictions',
    content:
      'You shall not, directly or indirectly:\n(a) Decompile, disassemble, reverse engineer, decrypt, extract, or otherwise attempt to derive or reconstruct the source code or bytecode of the Software or any part thereof;\n(b) Modify, adapt, translate, enhance, or create derivative works of the Software or any portion thereof;\n(c) Sell, resell, rent, lease, lend, license, sublicense, distribute, assign, host, outsource, or commercially exploit the Software or make the Software available to any third party for a fee;\n(d) Distribute, publish, or mirror pre-compiled binary packages, APKs, AABs, DMGs, EXEs, MSIs, or application bundles outside of official ArmoryVault distribution channels without prior written consent from the Licensor;\n(e) Remove, alter, cover, or obscure any copyright notices, proprietary legends, trademarks, or digital signatures affixed to or contained within the Software;\n(f) Re-brand, white-label, fork, or redistribute the Software under any other project, product, or company name.',
  },
  {
    title: '4. User Data Sovereignty & Air-Gapped Privacy',
    content:
      'The Licensor firmly believes in absolute privacy and individual sovereignty:\n(a) You retain 100% sole, exclusive, and unencumbered ownership of all data, firearm records, serial numbers, reloading recipes, range logs, images, and encryption keys created or stored within the Software ("User Data").\n(b) The Software is architected to operate 100% locally and offline. It does not contain telemetry, tracking beacons, analytics trackers, or third-party cloud connections.\n(c) Local Wi-Fi synchronization operates strictly point-to-point within your local area network (LAN) using user-controlled end-to-end AES-256-GCM encryption. The Licensor has zero access to your vault, passwords, or inventory.',
  },
  {
    title: '5. Disclaimer of Warranties',
    content:
      'THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE LICENSOR DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT. THE LICENSOR DOES NOT WARRANT THAT THE SOFTWARE WILL MEET YOUR REQUIREMENTS, OPERATE WITHOUT INTERRUPTION, BE SECURE, OR BE ENTIRELY FREE OF DEFECTS OR ERRORS.',
  },
  {
    title: '6. Firearms & Handloading Safety Disclaimer',
    content:
      'ARMORYVAULT AND ITS INCLUDED TOOLS, BALLISTICS CALCULATORS, POWDER CHARGE METRICS, TORQUE SPECIFICATIONS, AND MAINTENANCE GAUGES ARE PROVIDED STRICTLY AS INFORMATIONAL AIDS.\n\nHANDLOADING, AMMUNITION MANUFACTURING, FIREARM MODIFICATIONS, AND SHOOTING SPORTS INVOLVE INHERENT RISKS OF SEVERE BODILY INJURY, DEATH, AND PROPERTY DAMAGE. YOU ARE SOLELY RESPONSIBLE FOR VERIFYING ALL RELOADING DATA AGAINST CERTIFIED PUBLISHED LOAD MANUALS FROM RECOGNIZED POWDER AND BULLET MANUFACTURERS (E.G., HODGDON, ALLIANT, VIHTAVUORI, HORNADY, SIERRA) AND COMPLYING WITH ALL APPLICABLE LOCAL, STATE, AND FEDERAL LAWS (INCLUDING ATF REGULATIONS).\n\nUNDER NO CIRCUMSTANCES SHALL THE LICENSOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING FROM RELOADING ERRORS, WEAPON MALFUNCTIONS, ACCIDENTS, MISUSE, OR RELIANCE UPON DATA GENERATED OR STORED BY THE SOFTWARE.',
  },
  {
    title: '7. Termination',
    content:
      'This Agreement is effective until terminated. Your rights under this Agreement will terminate immediately and automatically without notice from the Licensor if you fail to comply with any of the terms or restrictions set forth herein. Upon termination, you must cease all use of the Software and permanently delete and destroy all copies of the Software in your possession or control.',
  },
  {
    title: '8. Governing Law & Entire Agreement',
    content:
      'This Agreement constitutes the entire agreement between you and the Licensor concerning the Software and supersedes all prior or contemporaneous understandings, representations, and agreements regarding the subject matter hereof.',
  },
];
