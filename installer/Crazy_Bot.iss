#define MyAppName "Crazy Bot"
#define MyAppVersion "0.1.1-test"
#define MyAppPublisher "Crazy_Batto"
#define MyAppExeName "Crazy_Bot.exe"

[Setup]
AppId={{8E9BE7D1-62C5-4D0A-B65D-1C143E3EAB7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Crazy Bot
DefaultGroupName=Crazy Bot
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=Crazy_Bot_Test_Setup_0.1.1
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayName=Crazy Bot Testversion

[Dirs]
Name: "{commonappdata}\Crazy Bot"; Permissions: users-modify

[Files]
Source: "package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Crazy Bot\Crazy Bot starten"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autoprograms}\Crazy Bot\Dashboard öffnen"; Filename: "http://127.0.0.1:3210"
Name: "{autodesktop}\Crazy Bot"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Crazy Bot Testversion starten"; Flags: postinstall nowait skipifsilent
