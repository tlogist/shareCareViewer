# ShareCare DICOM Viewer

A Mac desktop app for viewing DICOM medical imagery from ShareCare.com CDs. Built with Electron and Cornerstone3D.

ShareCare distributes medical imagery on CDs with a Windows-only viewer (MicroDicom). This app provides a native Mac alternative with full viewing and measurement capabilities.

## Features

- **Study/Series Browser** — automatically scans and organizes DICOM files by study and series
- **2D Image Viewer** — displays DICOM images with proper windowing for both MR and CR modalities
- **Window/Level** — click-drag to adjust brightness and contrast
- **Pan & Zoom** — navigate large images (especially useful for high-resolution X-rays)
- **Slice Navigation** — scroll through MRI series with mousewheel
- **Measurement Tools** — length (mm), angle (degrees), elliptical ROI, and rectangular ROI with automatic calibration from DICOM pixel spacing
- **DICOM Metadata** — view all DICOM tags for the current image
- Supports MONOCHROME1 and MONOCHROME2 photometric interpretations
- 16-bit grayscale rendering

## Prerequisites

- macOS
- [Node.js](https://nodejs.org/) (v18 or later)
- npm (included with Node.js)

## Setup

```bash
git clone https://github.com/tlogist/shareCareViewer.git
cd shareCareViewer
npm install
```

## Adding DICOM Files

Copy your DICOM files into the `projects/` directory at the project root. The app expects the standard directory structure from ShareCare CDs:

```
projects/
├── 1.2.840.113619.6.514.../    # Each study in its own directory
│   ├── instance1.dcm
│   ├── instance2.dcm
│   └── ...
├── 1.2.840.114204.1.4.../
│   └── ...
```

If you have a ShareCare CD mounted, copy the contents of the `DICOM/` folder:

```bash
cp -R /Volumes/YOUR_CD_NAME/DICOM/* projects/
```

## Running

```bash
npm run dev
```

This starts the Electron app in development mode with hot-reload.

## Usage

1. **Select a series** — click any series in the left sidebar to load it into the viewer
2. **Adjust window/level** — with W/L tool active, click and drag on the image
3. **Scroll through slices** — use the mousewheel to navigate MRI slices
4. **Measure** — select Length, Angle, Ellipse ROI, or Rect ROI from the toolbar, then click on the image to place measurement points
5. **Clear measurements** — click Clear to remove all annotations
6. **Reset view** — click Reset to restore default window/level, pan, and zoom
7. **View DICOM tags** — click Tags to toggle the metadata panel

## Toolbar Reference

| Button | Function |
|--------|----------|
| W/L | Window/Level — drag to adjust brightness/contrast |
| Pan | Drag to pan the image |
| Zoom | Drag to zoom in/out |
| Scroll | Scroll through slices (also always active on mousewheel) |
| Length | Measure distance between two points (mm) |
| Angle | Measure angle between three points (degrees) |
| Ellipse ROI | Draw elliptical region — shows area and pixel statistics |
| Rect ROI | Draw rectangular region — shows area and pixel statistics |
| Reset | Reset window/level, pan, and zoom to defaults |
| Clear | Remove all measurement annotations |
| Tags | Toggle DICOM metadata panel |

## Technical Notes

- The app runs a local HTTP server on `127.0.0.1` (localhost only) to serve DICOM files to the Cornerstone3D image loader. This server is not accessible from other machines and shuts down when the app closes.
- A postinstall script (`scripts/patch-cornerstone.js`) patches Cornerstone3D to replace Web Worker initialization with a main-thread decoder. This works around a Vite bundling incompatibility with Cornerstone's worker pattern.
- Image decoding runs on the main thread, which is fine for local uncompressed DICOM files.

## Building for Production

```bash
npm run build
```

This outputs the bundled app to the `out/` directory.

## License

MIT
