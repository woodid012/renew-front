'use client';

import React, { useState, useEffect } from 'react';

const InputsSummaryPage = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch('/api/inputs-summary');
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                setSummary(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold my-4">Inputs Summary</h1>
            <div className="overflow-x-auto">
                <table className="table-auto w-full">
                    <thead className="bg-gray-200">
                        <tr>
                            {summary.length > 0 && Object.keys(summary[0]).map(key => (
                                <th key={key} className="px-4 py-2">{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((row, i) => (
                            <tr key={i} className="border-b">
                                {Object.values(row).map((value, j) => (
                                    <td key={j} className="px-4 py-2">{typeof value === 'object' ? JSON.stringify(value) : value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inputs-SummaryPage;