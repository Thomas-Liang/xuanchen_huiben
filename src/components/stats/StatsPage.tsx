import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Tabs } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  getGenerationStats,
  getApiStats,
  getTemplateStats,
  type GenerationStats,
  type ApiStats,
  type TemplateStats,
} from '../../api';

const COLORS = ['#1890ff', '#52c41a', '#ff4d4f', '#faad14', '#722ed1'];

export function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [genStats, setGenStats] = useState<GenerationStats | null>(null);
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [gen, api, template] = await Promise.all([
        getGenerationStats(30),
        getApiStats(20),
        getTemplateStats(),
      ]);
      setGenStats(gen);
      setApiStats(api);
      setTemplateStats(template);
    } catch (e) {
      console.error('加载统计数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'generation',
      label: '生成统计',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic title="总生成数" value={genStats?.total_generations || 0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="成功率"
                  value={genStats?.success_rate || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: (genStats?.success_rate || 0) > 80 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="成功次数"
                  value={genStats?.successful_generations || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="失败次数"
                  value={genStats?.failed_generations || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="每日生成趋势">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={genStats?.daily_stats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="总数"
                      stroke="#1890ff"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="success"
                      name="成功"
                      stroke="#52c41a"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      name="失败"
                      stroke="#ff4d4f"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="模型使用分布">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genStats?.model_usage || []}
                      dataKey="count"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {(genStats?.model_usage || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'api',
      label: 'API调用',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic title="总调用次数" value={apiStats?.total_calls || 0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均响应时间"
                  value={apiStats?.avg_response_time_ms || 0}
                  precision={0}
                  suffix="ms"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="成功次数"
                  value={apiStats?.successful_calls || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="失败次数"
                  value={apiStats?.failed_calls || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card title="各模型API调用统计">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiStats?.calls_by_model || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="call_count" name="调用次数" fill="#1890ff" />
                    <Bar dataKey="avg_response_time_ms" name="平均响应时间(ms)" fill="#faad14" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'template',
      label: '模板统计',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic title="模板总数" value={templateStats?.template_usage.length || 0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="收藏数"
                  value={templateStats?.favorite_count || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic title="总使用次数" value={templateStats?.total_usages || 0} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24}>
              <Card title="模板使用排行">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(templateStats?.template_usage || [])
                      .sort((a, b) => b.usage_count - a.usage_count)
                      .slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="template_name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="usage_count" name="使用次数" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 overflow-auto h-full">
      <Card title="📊 数据统计分析" extra={<a onClick={loadStats}>刷新</a>}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
