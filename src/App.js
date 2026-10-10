import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import ErrorBoundary from "./Components/common/ErrorBoundary";
import ConnectivityBanner from "./Components/common/ConnectivityBanner";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import Home from "./Components/marketing/Home";
import NotFound from "./Components/NotFound";
import LoginForm from "./Components/auth/LoginForm";
import SignupForm from "./Components/auth/SignupForm";
import ForgotPasswordForm from "./Components/auth/ForgotPasswordForm";
import ResetPasswordForm from "./Components/auth/ResetPasswordForm";
import AcceptInvite from "./Components/auth/AcceptInvite";
import RequireOrganizer from "./Components/auth/RequireOrganizer";
import DashboardLayout from "./Components/dashboard/DashboardLayout";
import EventList from "./Components/dashboard/EventList";
import EventForm from "./Components/dashboard/EventForm";
import EventOverview from "./Components/dashboard/EventOverview";
import SportManager from "./Components/dashboard/SportManager";
import FixturesManager from "./Components/dashboard/FixturesManager";
import TeamManager from "./Components/dashboard/TeamManager";
import RegistrationReviewQueue from "./Components/dashboard/RegistrationReviewQueue";
import PlayerPool from "./Components/dashboard/PlayerPool";
import StandingsManager from "./Components/dashboard/StandingsManager";
import PlayerImport from "./Components/dashboard/PlayerImport";
import OrganizerInvites from "./Components/dashboard/OrganizerInvites";
import ActivityLog from "./Components/dashboard/ActivityLog";
import PlayerPortal from "./Components/player/PlayerPortal";
import PublicEventPage from "./Components/events/PublicEventPage";
import OrganizerConsole from "./Components/auctionRoom/OrganizerConsole";
import PublicRegistrationForm from "./Components/registration/PublicRegistrationForm";
import TeamJoinForm from "./Components/registration/TeamJoinForm";
import TeamBidderView from "./Components/registration/TeamBidderView";
import SpectatorView from "./Components/registration/SpectatorView";

function AppRoutes() {
  // Keyed by pathname so navigating away from a crashed page (even via a plain link click, not
  // just a reload) gives the boundary a fresh mount instead of staying stuck on the old error.
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/invite/:orgId/:inviteId" element={<AcceptInvite />} />

        <Route
          path="/app"
          element={
            <RequireOrganizer>
              <DashboardLayout />
            </RequireOrganizer>
          }
        >
          <Route index element={<Navigate to="events" replace />} />
          <Route path="events" element={<EventList />} />
          <Route path="organizers" element={<OrganizerInvites />} />
          <Route path="events/new" element={<EventForm />} />
          <Route path="events/:eventId" element={<EventOverview />} />
          <Route path="events/:eventId/sports" element={<SportManager />} />
          <Route path="events/:eventId/fixtures" element={<FixturesManager />} />
          <Route path="events/:eventId/teams" element={<TeamManager />} />
          <Route path="events/:eventId/registrations" element={<RegistrationReviewQueue />} />
          <Route path="events/:eventId/players" element={<PlayerPool />} />
          <Route path="events/:eventId/standings" element={<StandingsManager />} />
          <Route path="events/:eventId/import" element={<PlayerImport />} />
          <Route path="events/:eventId/console" element={<OrganizerConsole />} />
          <Route path="events/:eventId/activity" element={<ActivityLog />} />
        </Route>

        <Route path="/e/:eventSlug" element={<PublicEventPage />} />
        <Route path="/e/:eventSlug/register" element={<PublicRegistrationForm />} />
        <Route path="/e/:eventSlug/portal" element={<PlayerPortal />} />
        <Route path="/e/:eventSlug/join" element={<TeamJoinForm />} />
        <Route path="/e/:eventSlug/bid" element={<TeamBidderView />} />
        <Route path="/e/:eventSlug/watch" element={<SpectatorView />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <div className="wrapper">
            <Navbar />
            <ConnectivityBanner />
            <div className="main-panel">
              <AppRoutes />
            </div>
            <Footer />
          </div>
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
