// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LabyrinthSolver",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .executable(name: "LabyrinthSolverApp", targets: ["LabyrinthSolverApp"]),
        .library(name: "LabyrinthSolverCore", targets: ["LabyrinthSolverCore"])
    ],
    targets: [
        .target(
            name: "LabyrinthSolverCore",
            dependencies: []
        ),
        .executableTarget(
            name: "LabyrinthSolverApp",
            dependencies: ["LabyrinthSolverCore"]
        ),
        .testTarget(
            name: "LabyrinthSolverTests",
            dependencies: ["LabyrinthSolverCore"]
        )
    ]
)
