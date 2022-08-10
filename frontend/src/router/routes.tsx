import { RouteObject } from "react-router-dom";
import TwoBarLayout from "../layouts/TwoBarLayout";
import Projects from "../views/projects/Projects";
import OneBarLayout from "../layouts/OneBarLayout";
import About from "../views/About";
import Annotation from "../views/annotation/Annotation";
import Analysis from "../views/analysis/Analysis";
import Logbook from "../views/logbook/Logbook";
import Login from "../views/Login";
import ProjectUpdate from "../views/projectsettings/update/ProjectUpdate";
import NotFound from "../views/NotFound";
import Imprint from "../views/Imprint";
import NoBarLayout from "../layouts/NoBarLayout";
import Register from "../views/registration/Register";
import ProjectCreation from "../views/projectsettings/creation/ProjectCreation";
import ProjectSettings from "../views/projectsettings/ProjectSettings";
import Search from "../views/search/Search";
import RequireAuth from "../auth/RequireAuth";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <NoBarLayout />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
  {
    path: "/",
    element: <OneBarLayout />,
    children: [
      {
        path: "/projects",
        element: <Projects />,
      },
      {
        path: "/projectsettings",
        element: <ProjectSettings />,
        children: [
          { index: true, element: <ProjectCreation /> },
          { path: "/projectsettings/:projectId", element: <ProjectUpdate /> },
        ],
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/imprint",
        element: <Imprint />,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/project/:projectId",
    element: (
      <RequireAuth>
        <TwoBarLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "/project/:projectId/annotation/",
        element: <Annotation />,
      },
      {
        path: "/project/:projectId/annotation/:sdocId",
        element: <Annotation />,
      },
      {
        path: "/project/:projectId/search",
        element: <Search />,
      },
      {
        path: "/project/:projectId/search/doc/:sdocId",
        element: <Search />,
      },
      {
        path: "/project/:projectId/analysis",
        element: <Analysis />,
      },
      {
        path: "/project/:projectId/logbook",
        element: <Logbook />,
      },
      {
        path: "/project/:projectId/logbook/:category",
        element: <Logbook />,
      },
    ],
  },
];

export default routes;
