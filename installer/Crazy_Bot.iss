#define MyAppName "Crazy Bot"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Crazy_Batto"
#define MyAppExeName "Start-Crazy-Bot.cmd"

[Setup]
AppId={{8E9BE7D1-62C5-4D0A-B65D-1C143E3EAB7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Crazy Bot
DefaultGroupName=Crazy Bot
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=Crazy_Bot_Setup_0.1.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName=Crazy Bot
SetupLogging=yes

[Files]
Source: "package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Crazy Bot\Crazy Bot starten"; Filename: "{app}\Start-Crazy-Bot.cmd"; WorkingDir: "{app}"
Name: "{autoprograms}\Crazy Bot\Crazy Bot konfigurieren"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Configure-Crazy-Bot.ps1"""; WorkingDir: "{app}"
Name: "{autoprograms}\Crazy Bot\Dashboard öffnen"; Filename: "http://127.0.0.1:3210"
Name: "{autodesktop}\Crazy Bot"; Filename: "{app}\Start-Crazy-Bot.cmd"; WorkingDir: "{app}"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Configure-Crazy-Bot.ps1"""; Description: "Crazy Bot jetzt konfigurieren"; Flags: postinstall nowait skipifsilent unchecked
Filename: "{app}\Start-Crazy-Bot.cmd"; Description: "Crazy Bot jetzt starten"; Flags: postinstall nowait skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
