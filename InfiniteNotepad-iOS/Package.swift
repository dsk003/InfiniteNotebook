// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "InfiniteNotepad",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "InfiniteNotepad",
            targets: ["InfiniteNotepad"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "InfiniteNotepad",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift")
            ])

    ]
)
