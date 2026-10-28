// Cuts people out of a photo with Apple's Vision framework: one mask PNG for
// all the foreground subjects together (fg.png, crisp edges) and one per
// person (person-N.png, which tells people apart). runner.mjs combines them.
//
//   swiftc -O segment.swift -o segment && ./segment photo.jpg outdir
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("can't read image") }

let ctx = CIContext()
func save(_ buffer: CVPixelBuffer, _ name: String) {
  var ci = CIImage(cvPixelBuffer: buffer)
  let sx = CGFloat(cg.width) / ci.extent.width
  let sy = CGFloat(cg.height) / ci.extent.height
  ci = ci.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
  let out = outDir.appendingPathComponent(name)
  try! ctx.writePNGRepresentation(of: ci, to: out, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
  print(out.path)
}

let handler = VNImageRequestHandler(cgImage: cg)
let fg = VNGenerateForegroundInstanceMaskRequest()
let people = VNGeneratePersonInstanceMaskRequest()
try handler.perform([fg, people])

if let r = fg.results?.first {
  save(try r.generateScaledMaskForImage(forInstances: r.allInstances, from: handler), "fg.png")
}
if let r = people.results?.first {
  for i in r.allInstances {
    save(try r.generateScaledMaskForImage(forInstances: [i], from: handler), "person-\(i).png")
  }
}
