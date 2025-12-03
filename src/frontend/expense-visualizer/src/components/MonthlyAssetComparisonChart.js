import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { formatCurrency } from '../utils/currency';

const MonthlyAssetComparisonChart = ({ data, currency }) => {
    if (!data || data.length === 0) {
        return <p>No monthly asset data available.</p>;
    }

    // Process data for Recharts
    // We need to transform the data from:
    // [{ YearMonth: "2023-01", AssetType: "Stocks", AssetSubtype: "Tech", total_value: 1000 }, ...]
    // To:
    // [{ YearMonth: "2023-01", "Stocks - Tech": 1000, "Bonds - Govt": 500, ... }, ...]

    const processedDataMap = new Map();

    data.forEach(item => {
        const { YearMonth, AssetType, AssetSubtype, total_value } = item;
        const key = AssetSubtype ? `${AssetType} - ${AssetSubtype}` : AssetType;

        if (!processedDataMap.has(YearMonth)) {
            processedDataMap.set(YearMonth, { YearMonth });
        }
        processedDataMap.get(YearMonth)[key] = (processedDataMap.get(YearMonth)[key] || 0) + total_value;
    });

    const processedData = Array.from(processedDataMap.values());

    // Get all unique asset type/subtype combinations for the stack keys
    const allKeys = Array.from(new Set(data.map(item => item.AssetSubtype ? `${item.AssetType} - ${item.AssetSubtype}` : item.AssetType)));

    // Sort processedData by YearMonth
    processedData.sort((a, b) => a.YearMonth.localeCompare(b.YearMonth));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip card">
                    <p className="label">{`Month: ${label}`}</p>
                    {payload.map((entry, index) => (
                        <p key={`item-${index}`} style={{ color: entry.color }}>
                            {`${entry.name}: ${formatCurrency(entry.value, currency)}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Generate a color for each unique asset type/subtype combination
    const colors = [
        '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c', '#8dd1e1', '#83a6ed', '#8c97d2', '#7c7c7c'
    ];
    const getColor = (index) => colors[index % colors.length];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={processedData}
                margin={{
                    top: 20, right: 30, left: 20, bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="YearMonth" />
                <YAxis tickFormatter={(value) => formatCurrency(value, currency)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allKeys.map((key, index) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={getColor(index)} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default MonthlyAssetComparisonChart;
