import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// A last line of defense: without this, any uncaught render error (a stale/orphaned reference, a
// malformed document, anything) blanks the entire tab with no recovery -- especially bad if it
// happens on the organizer's console mid-auction. This catches it and offers a reload instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Box sx={{ color: "error.main", mb: 2 }}>
          <ErrorOutlineIcon sx={{ fontSize: 56 }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Something went wrong
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This page hit an unexpected error. Reloading usually fixes it -- nothing you were doing elsewhere (like an
          in-progress auction) is affected, since all of that lives on the server, not in this tab.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </Container>
    );
  }
}
