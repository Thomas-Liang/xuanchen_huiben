import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ConfigProvider, 
  Layout, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Space, 
  message,
  Tag,
  Empty,
  Spin
} from 'antd';
import { 
  PlayCircleOutlined, 
  UserOutlined, 
  AppstoreOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { ParsedPrompt } from './types';
import './App.css';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const themeConfig = {
  token: {
    colorPrimary: '#6366f1',
    borderRadius: 12,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
  },
};

const segmentTags: Record<string, { color: string; icon: any }> = {
  scene: { color: '#10b981', icon: <AppstoreOutlined /> },
  action: { color: '#f59e0b', icon: <PlayCircleOutlined /> },
  character: { color: '#6366f1', icon: <UserOutlined /> },
  background: { color: '#8b5cf6', icon: <AppstoreOutlined /> },
  other: { color: '#64748b', icon: <RobotOutlined /> },
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedPrompt | null>(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    setLoading(true);
    try {
      const result = await invoke<ParsedPrompt>('parse_prompt', { prompt });
      setParsedResult(result);
      message.success('解析成功');
    } catch (error) {
      message.error(`解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    '在阳光明媚的森林里@小明 正在愉快地跑步',
    '夜晚的城市街道@女孩 穿着漂亮的裙子行走',
    '海边的日落@英雄 站在礁石上',
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="app-layout">
        <div className="header-bg" />
        <Header className="app-header">
          <div className="header-content">
            <RobotOutlined className="header-icon" />
            <Title level={4} className="header-title">
              AI绘画助手
            </Title>
          </div>
        </Header>
        <Content className="app-content">
          <div className="main-container">
            <Card className="prompt-card" bordered={false}>
              <div className="card-header">
                <Title level={5} className="card-title">输入提示词</Title>
                <Text type="secondary">使用 @角色名 绑定参考图</Text>
              </div>
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你的画面，如：在森林里@小明 正在跑步..."
                rows={4}
                className="prompt-input"
                maxLength={500}
                showCount
              />
              <div className="prompt-actions">
                <Button 
                  type="primary" 
                  onClick={handleParse} 
                  loading={loading}
                  size="large"
                  icon={<PlayCircleOutlined />}
                  className="parse-btn"
                >
                  开始解析
                </Button>
              </div>
              <div className="example-prompts">
                <Text type="secondary" className="example-label">试试看：</Text>
                <Space wrap>
                  {examplePrompts.map((example, idx) => (
                    <Tag 
                      key={idx} 
                      className="example-tag"
                      onClick={() => setPrompt(example)}
                    >
                      {example.slice(0, 20)}...
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>

            <Spin spinning={loading}>
              {parsedResult ? (
                <div className="results-container">
                  <Card className="result-card original-card" bordered={false}>
                    <div className="card-header">
                      <Title level={5} className="card-title">原始提示词</Title>
                    </div>
                    <Paragraph className="original-text" copyable>
                      {parsedResult.original}
                    </Paragraph>
                  </Card>

                  <div className="results-grid">
                    {parsedResult.characters.length > 0 && (
                      <Card className="result-card" bordered={false}>
                        <div className="card-header">
                          <UserOutlined />
                          <Title level={5} className="card-title">角色</Title>
                          <Tag color="blue">{parsedResult.characters.length}</Tag>
                        </div>
                        <div className="character-list">
                          {parsedResult.characters.map((char, idx) => (
                            <div key={idx} className="character-item">
                              <div className="character-avatar">
                                {char.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="character-info">
                                <Text strong>@{char.name}</Text>
                                <Tag color={char.bound ? 'green' : 'default'} className="bind-tag">
                                  {char.bound ? '已绑定' : '未绑定'}
                                </Tag>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {parsedResult.segments.length > 0 && (
                      <Card className="result-card" bordered={false}>
                        <div className="card-header">
                          <AppstoreOutlined />
                          <Title level={5} className="card-title">内容分段</Title>
                          <Tag color="purple">{parsedResult.segments.length}</Tag>
                        </div>
                        <div className="segment-list">
                          {parsedResult.segments.map((seg, idx) => {
                            const tagInfo = segmentTags[seg.type] || segmentTags.other;
                            return (
                              <div key={idx} className="segment-item">
                                <Tag color={tagInfo.color} icon={tagInfo.icon} className="segment-tag">
                                  {seg.type}
                                </Tag>
                                <Text className="segment-content">{seg.content}</Text>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>

                  {parsedResult.characters.length === 0 && parsedResult.segments.length === 0 && (
                    <Card className="result-card" bordered={false}>
                      <Empty 
                        description="未检测到角色或分段" 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Card>
                  )}
                </div>
              ) : (
                !loading && (
                  <Card className="result-card empty-card" bordered={false}>
                    <Empty 
                      description="输入提示词并点击解析开始" 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                )
              )}
            </Spin>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
