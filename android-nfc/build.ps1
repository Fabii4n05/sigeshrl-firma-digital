param([string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk", [string]$JavaPath = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
if (-not $JavaPath) {
  $candidate = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory | Where-Object Name -Like 'jdk-17*' | Select-Object -First 1
  if (-not $candidate) { throw 'Instala Java 17 o define JAVA_HOME.' }
  $JavaPath = $candidate.FullName
}
$toolsDir = Get-ChildItem (Join-Path $SdkPath 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$platform = Get-ChildItem (Join-Path $SdkPath 'platforms') -Directory | Sort-Object Name -Descending | Select-Object -First 1
if (-not $toolsDir -or -not $platform) { throw 'Instala una plataforma y Build Tools del Android SDK.' }
$toolsPath = $toolsDir.FullName
$androidJar = Join-Path $platform.FullName 'android.jar'
$build = Join-Path $PSScriptRoot 'build'
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
$output = Join-Path $project 'public\android'
New-Item -ItemType Directory -Force -Path $build,$classes,$dex,$output | Out-Null
function Run-Tool([string]$Executable, [string[]]$Arguments) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló la compilación con $Executable (código $LASTEXITCODE)." }
}
$unsigned = Join-Path $build 'unsigned.apk'
$classJar = Join-Path $build 'classes.jar'
$aligned = Join-Path $build 'aligned.apk'
$apk = Join-Path $output 'SIGESHRL-Lector-NFC.apk'
Run-Tool (Join-Path $toolsPath 'aapt2.exe') @('link','-o',$unsigned,'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'-I',$androidJar)
$sources = @(Get-ChildItem (Join-Path $PSScriptRoot 'src') -Recurse -Filter '*.java' | ForEach-Object FullName)
Run-Tool (Join-Path $JavaPath 'bin\javac.exe') (@('-encoding','UTF-8','-source','8','-target','8','-classpath',$androidJar,'-d',$classes) + $sources)
Run-Tool (Join-Path $JavaPath 'bin\jar.exe') @('cf',$classJar,'-C',$classes,'.')
$savedJava = $env:JAVA_HOME
try {
  $env:JAVA_HOME = $JavaPath
  Run-Tool (Join-Path $toolsPath 'd8.bat') @('--lib',$androidJar,'--min-api','26','--output',$dex,$classJar)
  Run-Tool (Join-Path $JavaPath 'bin\jar.exe') @('uf',$unsigned,'-C',$dex,'classes.dex')
  Run-Tool (Join-Path $toolsPath 'zipalign.exe') @('-f','4',$unsigned,$aligned)
  $key = Join-Path $build 'debug.keystore'
  if (-not (Test-Path -LiteralPath $key)) {
    Run-Tool (Join-Path $JavaPath 'bin\keytool.exe') @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','3650','-dname','CN=SIGESHRL Academic Debug,O=Academic,C=PE','-noprompt')
  }
  Run-Tool (Join-Path $toolsPath 'apksigner.bat') @('sign','--v4-signing-enabled','false','--ks',$key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',$apk,$aligned)
  Run-Tool (Join-Path $toolsPath 'apksigner.bat') @('verify','--verbose',$apk)
} finally { $env:JAVA_HOME = $savedJava }
Write-Output "APK experimental preparado: $apk"
