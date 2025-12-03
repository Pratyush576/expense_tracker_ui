import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Line
} from 'recharts';
import { formatCurrency } from '../utils/currency';

const MonthlyAssetComparisonChart = ({ data, currency }) => {
    if (!data || data.length === 0) {
        return <p>No monthly asset data available.</p>;
    }

    const processedDataMap = new Map();

    data.forEach(item => {
        const { YearMonth, AssetType, AssetSubtype, total_value } = item;
        const key = AssetSubtype ? `${AssetType} - ${AssetSubtype}` : AssetType;

        if (!processedDataMap.has(YearMonth)) {
            processedDataMap.set(YearMonth, { YearMonth });
        }

        const monthData = processedDataMap.get(YearMonth);

        monthData[`${key} (Positive)`] = (monthData[`${key} (Positive)`] || 0) + (total_value > 0 ? total_value : 0);
        monthData[`${key} (Negative)`] = (monthData[`${key} (Negative)`] || 0) + (total_value < 0 ? total_value : 0);
        monthData[`${key} (Net)`] = (monthData[`${key} (Net)`] || 0) + total_value;

        monthData['Monthly Net Value'] = (monthData['Monthly Net Value'] || 0) + total_value;
        monthData['Monthly Positive Value'] = (monthData['Monthly Positive Value'] || 0) + (total_value > 0 ? total_value : 0);
        monthData['Monthly Negative Value'] = (monthData['Monthly Negative Value'] || 0) + (total_value < 0 ? total_value : 0);
    });

    const processedData = Array.from(processedDataMap.values());

    const allKeys = Array.from(new Set(data.map(item => item.AssetSubtype ? `${item.AssetType} - ${item.AssetSubtype}` : item.AssetType)));

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

    const colors = [
        '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c', '#8dd1e1', '#83a6ed', '#8c97d2', '#7c7c7c'
    ];
    const getColor = (index) => colors[index % colors.length];

    const CustomLegend = (props) => {
        const { payload } = props;
        const legendItems = payload.filter(item => item.dataKey !== 'Monthly Net Value'); // Exclude net value from this legend

        // Group legend items by asset type/subtype combination
        const groupedItems = {};
        legendItems.forEach(item => {
            const baseKey = item.dataKey.replace(' (Positive)', '').replace(' (Negative)', '');
            if (!groupedItems[baseKey]) {
                groupedItems[baseKey] = { positive: null, negative: null };
            }
            if (item.dataKey.includes('(Positive)')) {
                groupedItems[baseKey].positive = item;
            } else if (item.dataKey.includes('(Negative)')) {
                groupedItems[baseKey].negative = item;
            }
        });

        return (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Object.entries(groupedItems).map(([baseKey, { positive, negative }], index) => (
                    <li key={baseKey} style={{ margin: '0 10px 5px 0', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            backgroundColor: getColor(index),
                            marginRight: '5px',
                            borderRadius: '50%'
                        }}></span>
                        <span>{baseKey}</span>
                        {/* Optionally show positive/negative indicators if needed */}
                    </li>
                ))}
                {/* Add Monthly Net Value to the legend separately */}
                {payload.filter(item => item.dataKey === 'Monthly Net Value').map(item => (
                    <li key={item.dataKey} style={{ margin: '0 10px 5px 0', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '2px', // Line indicator
                            backgroundColor: item.color,
                            marginRight: '5px',
                        }}></span>
                        <span>{item.dataKey}</span>
                    </li>
                ))}
            </ul>
        );
    };

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
                <Legend content={<CustomLegend />} wrapperStyle={{ paddingTop: '20px' }} />
                {allKeys.map((key, index) => (
                    <React.Fragment key={key}>
                        <Bar dataKey={`${key} (Positive)`} stackId="a" fill={getColor(index)} />
                        <Bar dataKey={`${key} (Negative)`} stackId="a" fill={getColor(index)} opacity={0.6} />
                    </React.Fragment>
                ))}
                <Line type="monotone" dataKey="Monthly Net Value" stroke="#ff7300" strokeWidth={2} dot={{ r: 4 }} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default MonthlyAssetComparisonChart;
