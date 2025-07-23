# PowerShell script to access WSL2 server from Windows
# Run this from Windows PowerShell or save it as a .ps1 file

$wslIp = bash.exe -c "hostname -I | awk '{print $1}'"
$port = "6000"
$url = "http://${wslIp}:${port}"

Write-Host "WSL IP: $wslIp"
Write-Host "Opening: $url"

Start-Process $url