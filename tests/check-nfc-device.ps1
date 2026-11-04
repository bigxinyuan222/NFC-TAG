param(
	[string]$AdbPath = 'adb',
	[string]$Serial = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$deviceArguments = @()
if ($Serial) { $deviceArguments = @('-s', $Serial) }

function Invoke-NfcAdb([string[]]$CommandArguments) {
	$output = & $AdbPath @deviceArguments @CommandArguments 2>&1
	if ($LASTEXITCODE -ne 0) { throw ($output | Out-String) }
	return ($output | Out-String)
}

$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'fixtures\nfc-package-record.json') -Raw | ConvertFrom-Json
$appManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\manifest.json') -Raw | ConvertFrom-Json
$packageName = $fixture.packageName
$routes = @(
	@{ Name = 'AAR'; Action = 'android.nfc.action.NDEF_DISCOVERED'; Uri = 'vnd.android.nfc://ext/android.com:pkg' },
	@{ Name = 'mycheckin'; Action = 'android.nfc.action.NDEF_DISCOVERED'; Uri = 'mycheckin://checkin' },
	@{ Name = 'Tag'; Action = 'android.nfc.action.TAG_DISCOVERED'; Uri = '' }
)

# Query the installed APK, including the final exported flag after cloud manifest merging.
foreach ($route in $routes) {
	$query = @('shell', 'cmd', 'package', 'query-activities', '-a', $route.Action, '-c', 'android.intent.category.DEFAULT', '-p', $packageName)
	if ($route.Uri) { $query += @('-d', $route.Uri) }
	$resolved = Invoke-NfcAdb $query
	if ($resolved -notmatch '(?m)^1 activities found:' -or
		$resolved -notmatch '(?m)^\s*name=io\.dcloud\.PandoraEntry\s*$' -or
		$resolved -notmatch '(?m)^\s*enabled=true exported=true(?:\s|$)') {
		throw ($route.Name + ' must resolve uniquely to exported io.dcloud.PandoraEntry in the installed APK. Rebuild and install the native package.')
	}
	Write-Output ($route.Name + ' device route OK: io.dcloud.PandoraEntry, exported=true')
}

$installed = Invoke-NfcAdb @('shell', 'dumpsys', 'package', $packageName)
$versionCode = [regex]::Match($installed, '(?m)^\s*versionCode=(\d+)\s').Groups[1].Value
$versionName = [regex]::Match($installed, '(?m)^\s*versionName=(\S+)').Groups[1].Value
if ($versionCode -ne [string]$appManifest.versionCode -or $versionName -ne $appManifest.versionName) {
	throw ('Installed version ' + $versionName + '/' + $versionCode + ' does not match source ' + $appManifest.versionName + '/' + $appManifest.versionCode + '.')
}
Write-Output ('Installed version OK: ' + $versionName + '/' + $versionCode)
