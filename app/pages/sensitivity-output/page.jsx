"use client";

import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const SensitivityOutputPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchSensitivityData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/get-sensitivity-output');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                setData(result.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSensitivityData();
    }, []);

    if (loading) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                    <CircularProgress />
                    <Typography variant="h6" sx={{ ml: 2 }}>Loading sensitivity data...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">Error loading data: {error}</Alert>
            </Container>
        );
    }

    // If data is empty after loading, show info message
    if (!data || data.length === 0) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Sensitivity Analysis Output
                </Typography>
                
                <Alert severity="info">No sensitivity data available.</Alert>
            </Container>
        );
    }

    // Assuming data is an array of objects, each representing a row
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Sensitivity Analysis Output
            </Typography>

            

            <Paper elevation={3} sx={{ p: 2 }}>
                <TableContainer>
                    <Table stickyHeader aria-label="sensitivity output table">
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                                        {column.replace(/_/g, ' ')}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row, index) => (
                                <TableRow key={index}>
                                    {columns.map((column) => (
                                        <TableCell key={column}>
                                            {typeof row[column] === 'number' ? row[column].toLocaleString() : row[column]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
};

export default SensitivityOutputPage;