# Turns a canvas capture (PNG data URL saved as CDP JSON, or a PNG) into an
# Amazon main image: product filling 88% of a 2000 x 2000 pure-white square.
param(
  [Parameter(Mandatory)] [string]$Capture,
  [string]$Name = 'one-a-day-mens-237mL-amazon-main'
)
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$size = 2000
$fill = 0.88
# Anything this close to white is snapped to 255 so the field is pure white
$whiteFloor = 248

if ($Capture -like '*.json') {
  $v = (Get-Content -Raw $Capture | ConvertFrom-Json).result.value
  $bytes = [Convert]::FromBase64String($v.Substring($v.IndexOf(',') + 1))
  $src = [System.Drawing.Bitmap]::new([IO.MemoryStream]::new($bytes))
} else {
  $src = [System.Drawing.Bitmap]::FromFile($Capture)
}

# Lock bits for speed
$rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
$data = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$buf = New-Object byte[] ($data.Stride * $src.Height)
[Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)

$minX = $src.Width; $minY = $src.Height; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $src.Height; $y++) {
  $row = $y * $data.Stride
  for ($x = 0; $x -lt $src.Width; $x++) {
    $i = $row + $x * 4
    $lo = [Math]::Min([Math]::Min($buf[$i], $buf[$i + 1]), $buf[$i + 2])
    if ($lo -ge $whiteFloor) {
      $buf[$i] = 255; $buf[$i + 1] = 255; $buf[$i + 2] = 255; $buf[$i + 3] = 255
    } else {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
[Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $buf.Length)
$src.UnlockBits($data)

$w = $maxX - $minX + 1
$h = $maxY - $minY + 1
$scale = ($size * $fill) / [Math]::Max($w, $h)
$dw = [int]($w * $scale); $dh = [int]($h * $scale)

$dst = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$attr = New-Object System.Drawing.Imaging.ImageAttributes
$attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle ([int](($size - $dw) / 2)), ([int](($size - $dh) / 2)), $dw, $dh), $minX, $minY, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attr)
$g.Dispose()

$png = Join-Path $here "$Name.png"
$jpg = Join-Path $here "$Name.jpg"
$dst.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 95L
$dst.Save($jpg, $codec, $params)

$corner = $dst.GetPixel(5, 5)
"Product box ${w}x${h} px in capture; scaled into ${dw}x${dh} of ${size}x${size}"
"Fill: $([Math]::Round(100 * [Math]::Max($dw, $dh) / $size))% of the long side; corner RGB $($corner.R),$($corner.G),$($corner.B)"
$dst.Dispose(); $src.Dispose()
