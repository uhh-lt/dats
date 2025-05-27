import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "../auth/RequireAuth.tsx";
import NoBarLayout from "../layouts/PageLayouts/NoBarLayout.tsx";
import SideBarLayout from "../layouts/PageLayouts/SideBarLayout.tsx";
import Analysis from "../views/analysis/Analysis.tsx";
import AnnotationScaling from "../views/analysis/AnnotationScaling/AnnotationScaling.tsx";
import BBoxAnnotationAnalysis from "../views/analysis/BBoxAnnotationAnalysis/BBoxAnnotationAnalysis.tsx";
import CodeFrequencyAnalysis from "../views/analysis/CodeFrequency/CodeFrequencyAnalysis.tsx";
import CotaDashboard from "../views/analysis/ConceptsOverTime/CotaDashboard.tsx";
import CotaView from "../views/analysis/ConceptsOverTime/CotaView.tsx";
import SentAnnotationAnalysis from "../views/analysis/SentAnnotationAnalysis/SentAnnotationAnalysis.tsx";
import SpanAnnotationAnalysis from "../views/analysis/SpanAnnotationAnalysis/SpanAnnotationAnalysis.tsx";
import TagRecommendations from "../views/analysis/TagRecommendations/TagRecommendations.tsx";
import TimelineAnalysis from "../views/analysis/TimelineAnalysis/TimelineAnalysis.tsx";
import TimelineAnalysisDashboard from "../views/analysis/TimelineAnalysis/TimelineAnalysisDashboard.tsx";
import WordFrequency from "../views/analysis/WordFrequency/WordFrequency.tsx";
import Annotation from "../views/annotation/Annotation.tsx";
import AtlasDashboard from "../views/atlas/AtlasDashboard.tsx";
import Map from "../views/atlas/Map.tsx";
import MapDashboard from "../views/atlas/MapDashboard.tsx";
import Logbook from "../views/logbook/Logbook.tsx";
import Login from "../views/login/Login.tsx";
import Register from "../views/login/Register.tsx";
import NotFound from "../views/NotFound.tsx";
import Profile from "../views/profile/Profile.tsx";
import Projects from "../views/projects/Projects.tsx";
import Search from "../views/search/DocumentSearch/Search.tsx";
import ImageSimilaritySearch from "../views/search/ImageSearch/ImageSimilaritySearch.tsx";
import SentenceSimilaritySearch from "../views/search/SentenceSearch/SentenceSimilaritySearch.tsx";
import DocumentSampler from "../views/tools/DocumentSampler/DocumentSampler.tsx";
import DuplicateFinder from "../views/tools/DuplicateFinder/DuplicateFinder.tsx";
import MlAutomation from "../views/tools/MlAutomation/MlAutomation.tsx";
import Whiteboard from "../views/whiteboard/Whiteboard.tsx";
import WhiteboardDashboard from "../views/whiteboard/WhiteboardDashboard.tsx";

const router = createBrowserRouter([
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
    element: <SideBarLayout />,
    children: [
      {
        path: "/projects",
        element: (
          <RequireAuth>
            <Projects />
          </RequireAuth>
        ),
      },
      {
        path: "/me",
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/project/:projectId",
    element: (
      <RequireAuth>
        <SideBarLayout />
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
        path: "/project/:projectId/sentencesearch",
        element: <SentenceSimilaritySearch />,
      },
      {
        path: "/project/:projectId/imagesearch",
        element: <ImageSimilaritySearch />,
      },
      {
        path: "/project/:projectId/analysis",
        element: <Analysis />,
      },
      {
        path: "/project/:projectId/analysis/code-frequency",
        element: <CodeFrequencyAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/timeline",
        element: <TimelineAnalysisDashboard />,
      },
      {
        path: "/project/:projectId/analysis/timeline/:analysisId",
        element: <TimelineAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/span-annotations",
        element: <SpanAnnotationAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/sentence-annotations",
        element: <SentAnnotationAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/bbox-annotations",
        element: <BBoxAnnotationAnalysis />,
      },
      {
        path: "/project/:projectId/analysis/word-frequency",
        element: <WordFrequency />,
      },
      {
        path: "/project/:projectId/analysis/concepts-over-time-analysis",
        element: <CotaDashboard />,
      },
      {
        path: "/project/:projectId/analysis/concepts-over-time-analysis/:cotaId",
        element: <CotaView />,
      },
      {
        path: "/project/:projectId/analysis/annotation-scaling",
        element: <AnnotationScaling />,
      },
      {
        path: "/project/:projectId/analysis/tag-recommendations",
        element: <TagRecommendations />,
      },
      {
        path: "/project/:projectId/whiteboard",
        element: <WhiteboardDashboard />,
      },
      {
        path: "/project/:projectId/whiteboard/:whiteboardId",
        element: <Whiteboard />,
      },
      {
        path: "/project/:projectId/logbook",
        element: <Logbook />,
      },
      {
        path: "/project/:projectId/logbook/:category",
        element: <Logbook />,
      },
      {
        path: "/project/:projectId/tools/duplicate-finder",
        element: <DuplicateFinder />,
      },
      {
        path: "/project/:projectId/tools/document-sampler",
        element: <DocumentSampler />,
      },
      {
        path: "/project/:projectId/tools/ml-automation",
        element: <MlAutomation />,
      },
      {
        path: "/project/:projectId/whiteboard",
        element: <WhiteboardDashboard />,
      },
      {
        path: "/project/:projectId/atlas",
        element: <AtlasDashboard />,
      },
      {
        path: "/project/:projectId/atlas/:atlasId",
        element: <MapDashboard />,
      },
      {
        path: "/project/:projectId/atlas/:atlasId/map",
        element: <Map />,
      },
    ],
  },
]);

export default router;
