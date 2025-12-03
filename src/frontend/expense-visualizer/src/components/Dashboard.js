import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import Sidebar from './SideBar';
import MainContent from './MainContent';

const Dashboard = ({ theme, setTheme }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Expense Visualizer
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={() => setTheme(theme.palette.mode === 'dark' ? 'light' : 'dark')} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <MainContent>
        <Toolbar />
        <Typography variant="h4" gutterBottom>
          Welcome to your Dashboard
        </Typography>
        <Typography paragraph>
          This is where your charts and tables will go.
        </Typography>
      </MainContent>
    </Box>
  );
};

export default Dashboard;