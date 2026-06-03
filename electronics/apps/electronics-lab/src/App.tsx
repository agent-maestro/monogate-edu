import { Suspense, lazy, useEffect, useState } from "react";
import {
  AnalogDecisionsCourseSelect,
  ArtyA7Preview,
  BoundaryHardwareDemoCourseSelect,
  EnvironmentalGuardCourseSelect,
  Esp32CourseLanding,
  LandingPage,
  OptimizationBoundaryCourseSelect,
  OtherSystemsLanding,
  ReflexGuardCourseSelect,
  type LandingTarget
} from "./components/LandingPage";
import {
  analogSimulatorCourse,
  environmentGuardSimulatorCourse,
  optimizationBoundarySimulatorCourse,
  reflexSimulatorCourse
} from "./components/simulatorCourses";
import { ElectronicsGlossary } from "./components/ElectronicsGlossary";

const OptimizationBoundaryLab = lazy(() =>
  import("./components/OptimizationBoundaryLab").then((module) => ({ default: module.OptimizationBoundaryLab }))
);
const PhysicalBuildPanel = lazy(() =>
  import("./components/PhysicalBuildPanel").then((module) => ({ default: module.PhysicalBuildPanel }))
);
const SimulatorBench = lazy(() =>
  import("./components/SimulatorBench").then((module) => ({ default: module.SimulatorBench }))
);

type AppView =
  | "landing"
  | "esp32"
  | "reflexGuard"
  | "analogCourse"
  | "lab"
  | "analogLab"
  | "environmentCourse"
  | "environmentLab"
  | "boundaryHardwareCourse"
  | "physical"
  | "glossary"
  | "courseGlossary"
  | "arty"
  | "other"
  | "boundary"
  | "boundarySoftware"
  | "boundarySimulator";

const appRoutes: Record<LandingTarget, string> = {
  electronics: "/electronics",
  esp32: "/electronics/esp32",
  course: "/electronics/reflexcourse",
  reflexGuard: "/electronics/esp32/reflex-guard",
  lab: "/electronics/esp32/reflex-guard/lab",
  analogCourse: "/electronics/esp32/analog-decisions",
  analogLab: "/electronics/esp32/analog-decisions/lab",
  environmentCourse: "/electronics/esp32/environmental-guard-node",
  environmentLab: "/electronics/esp32/environmental-guard-node/lab",
  boundaryHardwareCourse: "/electronics/esp32/boundary-hardware-demo",
  physical: "/electronics/esp32/reflex-guard/physical",
  glossary: "/electronics/glossary",
  courseGlossary: "/electronics/esp32/reflex-guard/glossary",
  arty: "/electronics/arty-a7",
  other: "/electronics/other",
  boundary: "/electronics/other/OptimizationBoundary",
  boundarySoftware: "/electronics/other/OptimizationBoundary/software",
  boundarySimulator: "/electronics/esp32/boundary-hardware-demo/simulator"
};

function viewFromLocation(): AppView {
  if (typeof window === "undefined") return "landing";

  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const routeKey = pathname.toLowerCase();
  if (params.get("lab") === "trainer-v0") return "lab";
  if (routeKey === "/electronics/esp32") return "esp32";
  if (routeKey === "/electronics/reflexcourse/lab" || routeKey === "/electronics/esp32/reflex-guard/lab") return "lab";
  if (routeKey === "/electronics/analog-decisions" || routeKey === "/electronics/esp32/analog-decisions") return "analogCourse";
  if (routeKey === "/electronics/analog-decisions/lab" || routeKey === "/electronics/esp32/analog-decisions/lab") return "analogLab";
  if (
    routeKey === "/electronics/environmental-guard" ||
    routeKey === "/electronics/environment-guard" ||
    routeKey === "/electronics/esp32/environmental-guard-node"
  ) {
    return "environmentCourse";
  }
  if (
    routeKey === "/electronics/environmental-guard/lab" ||
    routeKey === "/electronics/environment-guard/lab" ||
    routeKey === "/electronics/esp32/environmental-guard-node/lab"
  ) {
    return "environmentLab";
  }
  if (routeKey === "/electronics/reflexcourse/physical" || routeKey === "/electronics/esp32/reflex-guard/physical") return "physical";
  if (routeKey === "/electronics/reflexcourse/glossary" || routeKey === "/electronics/esp32/reflex-guard/glossary") return "courseGlossary";
  if (routeKey === "/electronics/glossary") return "glossary";
  if (routeKey === "/electronics/reflexcourse" || routeKey === "/electronics/esp32/reflex-guard") return "reflexGuard";
  if (routeKey === "/electronics/arty-a7") return "arty";
  if (routeKey === "/electronics/other" || routeKey === "/electronics/othersystems") return "other";
  if (
    routeKey === "/electronics/other/optimizationboundary/software" ||
    routeKey === "/electronics/othersystems/optimizationboundary/software" ||
    routeKey === "/electronics/optimization-boundary/software"
  ) {
    return "boundarySoftware";
  }
  if (
    routeKey === "/electronics/esp32/boundary-hardware-demo/simulator" ||
    routeKey === "/electronics/other/optimizationboundary/simulator" ||
    routeKey === "/electronics/othersystems/optimizationboundary/simulator" ||
    routeKey === "/electronics/optimization-boundary/simulator"
  ) {
    return "boundarySimulator";
  }
  if (routeKey === "/electronics/esp32/boundary-hardware-demo") return "boundaryHardwareCourse";
  if (
    routeKey === "/electronics/other/optimizationboundary" ||
    routeKey === "/electronics/othersystems/optimizationboundary" ||
    routeKey === "/electronics/optimization-boundary"
  ) {
    return "boundary";
  }
  return "landing";
}

function viewForTarget(target: LandingTarget): AppView {
  if (target === "electronics") return "landing";
  if (target === "course") return "reflexGuard";
  return target;
}

function RouteLoading() {
  return (
    <main className="route-loading" aria-live="polite">
      <span>Loading lab...</span>
    </main>
  );
}

export function App() {
  const [appView, setAppView] = useState<AppView>(() => viewFromLocation());

  function navigate(target: LandingTarget) {
    setAppView(viewForTarget(target));
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", appRoutes[target]);
    }
  }

  useEffect(() => {
    const handlePopState = () => setAppView(viewFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (appView === "landing") {
    return <LandingPage onNavigate={navigate} />;
  }

  if (appView === "esp32") {
    return <Esp32CourseLanding onNavigate={navigate} onBack={() => navigate("electronics")} />;
  }

  if (appView === "reflexGuard") {
    return <ReflexGuardCourseSelect onNavigate={navigate} onBack={() => navigate("esp32")} />;
  }

  if (appView === "analogCourse") {
    return <AnalogDecisionsCourseSelect onNavigate={navigate} onBack={() => navigate("esp32")} />;
  }

  if (appView === "environmentCourse") {
    return <EnvironmentalGuardCourseSelect onNavigate={navigate} onBack={() => navigate("esp32")} />;
  }

  if (appView === "boundaryHardwareCourse") {
    return <BoundaryHardwareDemoCourseSelect onNavigate={navigate} onBack={() => navigate("esp32")} />;
  }

  if (appView === "physical") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <PhysicalBuildPanel
          onLaunchLab={() => navigate("lab")}
          onBack={() => navigate("reflexGuard")}
        />
      </Suspense>
    );
  }

  if (appView === "glossary") {
    return <ElectronicsGlossary mode="global" onNavigate={navigate} onBack={() => navigate("electronics")} />;
  }

  if (appView === "courseGlossary") {
    return <ElectronicsGlossary mode="course001" onNavigate={navigate} onBack={() => navigate("reflexGuard")} />;
  }

  if (appView === "arty") {
    return <ArtyA7Preview onBack={() => navigate("electronics")} />;
  }

  if (appView === "other") {
    return <OtherSystemsLanding onNavigate={navigate} onBack={() => navigate("electronics")} />;
  }

  if (appView === "boundary") {
    return <OptimizationBoundaryCourseSelect onNavigate={navigate} onBack={() => navigate("other")} />;
  }

  if (appView === "boundarySoftware") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <OptimizationBoundaryLab onBack={() => navigate("boundary")} onHome={() => navigate("electronics")} />
      </Suspense>
    );
  }

  if (appView === "boundarySimulator") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <SimulatorBench config={optimizationBoundarySimulatorCourse} onBack={() => navigate("boundaryHardwareCourse")} />
      </Suspense>
    );
  }

  if (appView === "analogLab") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <SimulatorBench config={analogSimulatorCourse} onBack={() => navigate("analogCourse")} />
      </Suspense>
    );
  }

  if (appView === "environmentLab") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <SimulatorBench config={environmentGuardSimulatorCourse} onBack={() => navigate("environmentCourse")} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteLoading />}>
      <SimulatorBench config={reflexSimulatorCourse} onBack={() => navigate("reflexGuard")} />
    </Suspense>
  );
}
