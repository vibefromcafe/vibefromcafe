import { Navigate } from "react-router";

export default function EventRedirect() {
  return <Navigate replace to="/events" />;
}
