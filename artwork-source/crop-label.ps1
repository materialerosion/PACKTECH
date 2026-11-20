# Crops the label panel out of the artwork proof and writes a rounded-corner PNG
# at the label's true 7.125" x 2.5" aspect for use as a wrap texture.
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = [System.Drawing.Bitmap]::FromFile((Join-Path $here '91049079_ONE-A-DAY_Mens_100ct_label_r2.jpg'))
$out = Join-Path $here '..\public\artwork\one-a-day-mens-100ct-label.png'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null

# Label panel inside the proof, px (blue edge to blue edge)
$crop = New-Object System.Drawing.Rectangle 214, 274, 532, 190

# Lift the panel out and paint over the proof's die line (2-3 px in) and dashed
# safe-area line (6-7 px in) by blending across them from the clean pixels on
# either side, so text near the edge is left alone
$panel = $src.Clone($crop, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$W = $panel.Width
$H = $panel.Height
function Blend($a, $b, $t) {
  [System.Drawing.Color]::FromArgb(255,
    [int]($a.R + ($b.R - $a.R) * $t), [int]($a.G + ($b.G - $a.G) * $t), [int]($a.B + ($b.B - $a.B) * $t))
}
foreach ($line in @(@(2, 3), @(6, 7))) {
  $lo = $line[0] - 1
  $hi = $line[1] + 1
  foreach ($i in $line) {
    $t = ($i - $lo) / ($hi - $lo)
    for ($x = 0; $x -lt $W; $x++) {
      $panel.SetPixel($x, $i, (Blend $panel.GetPixel($x, $lo) $panel.GetPixel($x, $hi) $t))
      $panel.SetPixel($x, $H - 1 - $i, (Blend $panel.GetPixel($x, $H - 1 - $lo) $panel.GetPixel($x, $H - 1 - $hi) $t))
    }
    for ($y = 0; $y -lt $H; $y++) {
      $panel.SetPixel($i, $y, (Blend $panel.GetPixel($lo, $y) $panel.GetPixel($hi, $y) $t))
      $panel.SetPixel($W - 1 - $i, $y, (Blend $panel.GetPixel($W - 1 - $lo, $y) $panel.GetPixel($W - 1 - $hi, $y) $t))
    }
  }
}

$dpi = 400
$w = [int](7.125 * $dpi)
$h = [int](2.5 * $dpi)
$r = [int](0.125 * $dpi)

$dst = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = 2 * $r
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($w - $d, 0, $d, $d, 270, 90)
$path.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
$path.AddArc(0, $h - $d, $d, $d, 90, 90)
$path.CloseFigure()
$g.SetClip($path)

$attr = New-Object System.Drawing.Imaging.ImageAttributes
$attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
$g.DrawImage($panel, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), 0, 0, $panel.Width, $panel.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)

$g.Dispose()
$panel.Dispose()
$dst.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
$src.Dispose()
"Wrote $out ($w x $h)"
