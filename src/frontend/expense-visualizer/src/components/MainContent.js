import React from 'react';
import { Box, Container } from '@mui/material';

const MainContent = ({ children }) => {
  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
    >
      <Container maxWidth="lg">
        {children}
      </Container>
    </Box>
  );
};

export default MainContent;
