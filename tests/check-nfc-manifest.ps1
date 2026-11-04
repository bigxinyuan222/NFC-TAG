param(
	[string]$ManifestPath = (Join-Path $PSScriptRoot '..\AndroidManifest.xml')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Reproduce the one-record AAR tag shown in NFC Tools, independent of the app reader.
$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'fixtures\nfc-package-record.json') -Raw | ConvertFrom-Json
$hex = $fixture.ndefHex
$bytes = [byte[]]::new($hex.Length / 2)
for ($index = 0; $index -lt $bytes.Length; $index++) {
	$bytes[$index] = [Convert]::ToByte($hex.Substring($index * 2, 2), 16)
}
if ($bytes.Length -ne 36 -or $bytes[0] -ne 0xD4) {
	throw 'Expected one short External NDEF record occupying 36 bytes.'
}
$recordType = [Text.Encoding]::ASCII.GetString($bytes, 3, $bytes[1])
$packageName = [Text.Encoding]::ASCII.GetString($bytes, 3 + $bytes[1], $bytes[2])
if ($recordType -cne 'android.com:pkg' -or $packageName -cne $fixture.packageName) {
	throw 'Unexpected AAR type or package payload.'
}

# Android maps an External record's TYPE to this URI; its PAYLOAD is the package name.
$ndefUri = [Uri]('vnd.android.nfc://ext/' + $recordType)
[xml]$manifest = Get-Content -LiteralPath $ManifestPath -Raw
$androidNamespace = 'http://schemas.android.com/apk/res/android'
$namespaces = [System.Xml.XmlNamespaceManager]::new($manifest.NameTable)
$namespaces.AddNamespace('android', $androidNamespace)
$ndefFilters = '/manifest/application/activity[@android:exported="true"]/intent-filter[action/@android:name="android.nfc.action.NDEF_DISCOVERED" and category/@android:name="android.intent.category.DEFAULT"]'
$aarFilter = $ndefFilters + '[data[@android:scheme="' + $ndefUri.Scheme + '" and @android:host="' + $ndefUri.Host + '" and @android:path="' + $ndefUri.AbsolutePath + '"]]'
$aarEntryMatches = $manifest.SelectNodes($aarFilter, $namespaces)
if ($aarEntryMatches.Count -ne 1) {
	throw ('AAR tag has no unique NFC entry: ' + $ndefUri + '. It can fall back to a launcher intent without the Tag.')
}
if ($aarEntryMatches[0].ParentNode.GetAttribute('name', $androidNamespace) -cne 'io.dcloud.PandoraEntry') {
	throw 'AAR must use PandoraEntry to initialize the runtime and forward the original NFC intent.'
}
$internalActivityNfcFilters = '/manifest/application/activity[@android:name="io.dcloud.PandoraEntryActivity"]/intent-filter[action[starts-with(@android:name,"android.nfc.action.")]]'
if ($manifest.SelectNodes($internalActivityNfcFilters, $namespaces).Count -ne 0) {
	throw 'NFC must not bypass the normal launcher by directly opening PandoraEntryActivity.'
}
if ($manifest.SelectNodes($ndefFilters + '[data/@android:scheme="mycheckin"]', $namespaces).Count -ne 1) {
	throw 'The mycheckin URI tag entry must remain available.'
}

Write-Output ('AAR manifest route OK: ' + $ndefUri + ' -> io.dcloud.PandoraEntry')
Write-Output ('AAR package: ' + $packageName + '; fixture UID: ' + $fixture.uidHex)
