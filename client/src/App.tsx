import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GangAuthProvider } from "./contexts/GangAuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Recruitment from "./pages/Recruitment";
import Reports from "./pages/Reports";
import Announcements from "./pages/Announcements";
import Scenarios from "./pages/Scenarios";
import Attendance from "./pages/Attendance";
import UsersManagement from "./pages/UsersManagement";
import ActivityLog from "./pages/ActivityLog";
import Complaints from "./pages/Complaints";
import Disciplinary from "./pages/Disciplinary";
import Departments from "./pages/Departments";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import QuizPage from "./pages/QuizPage";
import GangSelector from "./pages/GangSelector";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/members" component={Members} />
      <Route path="/dashboard/recruitment" component={Recruitment} />
      <Route path="/dashboard/reports" component={Reports} />
      <Route path="/dashboard/all-reports" component={Reports} />
      <Route path="/dashboard/announcements" component={Announcements} />
      <Route path="/dashboard/scenarios" component={Scenarios} />
      <Route path="/dashboard/attendance" component={Attendance} />
      <Route path="/dashboard/users" component={UsersManagement} />
      <Route path="/dashboard/activity" component={ActivityLog} />
      <Route path="/dashboard/complaints" component={Complaints} />
      <Route path="/dashboard/disciplinary" component={Disciplinary} />
      <Route path="/dashboard/departments" component={Departments} />
      <Route path="/dashboard/recruiter" component={RecruiterDashboard} />
      <Route path="/gang-selector" component={GangSelector} />
      <Route path="/quiz/:applicantId/:gangId" component={QuizPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <GangAuthProvider>
          <TooltipProvider>
            <Toaster position="top-center" />
            <Router />
          </TooltipProvider>
        </GangAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
