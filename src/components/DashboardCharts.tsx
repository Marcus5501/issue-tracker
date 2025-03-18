import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip,
  Label
} from 'recharts';

interface DashboardChartsProps {
  pendingIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  pendingIssues,
  inProgressIssues,
  resolvedIssues,
  highPriorityIssues,
  mediumPriorityIssues,
  lowPriorityIssues
}) => {
  // Status data
  const statusData = [
    { name: 'Pending', value: pendingIssues, color: '#FF6B6B' },
    { name: 'In Progress', value: inProgressIssues, color: '#4ECDC4' },
    { name: 'Resolved', value: resolvedIssues, color: '#96CEB4' },
  ];
  
  // Priority data
  const priorityData = [
    { name: 'High', value: highPriorityIssues, color: '#FF6B6B' },
    { name: 'Medium', value: mediumPriorityIssues, color: '#FFD93D' },
    { name: 'Low', value: lowPriorityIssues, color: '#6BCB77' },
  ];

  // Calculate totals
  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);
  const totalPriority = priorityData.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentages to data
  const statusDataWithPercent = statusData.map(item => ({
    ...item,
    percentage: totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0
  }));
  
  const priorityDataWithPercent = priorityData.map(item => ({
    ...item,
    percentage: totalPriority > 0 ? Math.round((item.value / totalPriority) * 100) : 0
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${payload[0].name} : ${payload[0].value}`}</p>
          <p className="percent">{`${payload[0].payload.percentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-charts">
      {/* Status Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Status Distribution</h3>
        <div className="chart-content">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDataWithPercent}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDataWithPercent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    value={totalStatus}
                    position="center"
                    fill="#333333"
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                    }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-details">
            {statusDataWithPercent.map((item, index) => (
              <div className="progress-item" key={index}>
                <div className="progress-header">
                  <div className="progress-label">
                    <span className="color-dot" style={{ backgroundColor: item.color }}></span>
                    <span>{item.name}</span>
                  </div>
                  <div className="progress-value">{item.value} ({item.percentage}%)</div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ 
                    width: `${item.percentage}%`, 
                    backgroundColor: item.color 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="chart-card">
        <h3 className="chart-title priority-title">Priority Breakdown</h3>
        <div className="chart-content">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityDataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {priorityDataWithPercent.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CSS Styles */}
      <style>
        {`
          .dashboard-charts {
            width: 100%;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .chart-card {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 16px;
            overflow: hidden;
          }

          .chart-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            position: relative;
            display: inline-block;
          }

          .chart-title::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 40px;
            height: 3px;
            background: linear-gradient(90deg, #4ECDC4, #45B7AF);
            border-radius: 2px;
          }

          .priority-title::after {
            background: linear-gradient(90deg, #FF6B6B, #FF8E8E);
          }

          .chart-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .chart-container {
            height: 250px;
          }

          .chart-details {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 12px;
          }

          .progress-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .progress-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
          }

          .color-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }

          .progress-value {
            font-size: 14px;
            font-weight: 500;
            color: #666;
          }

          .progress-bar {
            height: 8px;
            background-color: #f1f5f9;
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-out;
          }

          .custom-tooltip {
            background-color: white;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid #f0f0f0;
          }

          .label {
            font-weight: bold;
            margin: 0;
            font-size: 14px;
          }

          .percent {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #666;
          }
        `}
      </style>
    </div>
  );
};

export default DashboardCharts; 