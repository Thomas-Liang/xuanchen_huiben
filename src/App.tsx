import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ConfigProvider, Layout, Input, Button, Card, Typography, Space, message } from 'antd';
import type { ParsedPrompt } from './types';
import './App.css';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

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
      message.success('提示词解析成功');
    } catch (error) {
      message.error(`解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            AI绘画 - 提示词解析
          </Title>
        </Header>
        <Content className="app-content">
          <Card title="提示词输入" className="prompt-card">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入提示词，使用@角色名 绑定参考图，如：在森林里@小明 正在跑步"
                rows={4}
                style={{ fontSize: 16 }}
              />
              <Button 
                type="primary" 
                onClick={handleParse} 
                loading={loading}
                size="large"
              >
                解析提示词
              </Button>
            </Space>
          </Card>

          {parsedResult && (
            <Card title="解析结果" className="result-card">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong>原始提示词：</Text>
                  <Text>{parsedResult.original}</Text>
                </div>
                
                {parsedResult.characters.length > 0 && (
                  <div>
                    <Text strong>检测到的角色：</Text>
                    <div style={{ marginTop: 8 }}>
                      {parsedResult.characters.map((char, idx) => (
                        <div key={idx} style={{ padding: 8, marginBottom: 8, background: '#f5f5f5', borderRadius: 6 }}>
                          <Text>@{char.name}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {char.bound ? '(已绑定参考图)' : '(未绑定参考图)'}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedResult.segments.length > 0 && (
                  <div>
                    <Text strong>分割结果：</Text>
                    <div style={{ marginTop: 8 }}>
                      {parsedResult.segments.map((seg, idx) => (
                        <div key={idx} style={{ padding: 8, marginBottom: 8, background: '#f0f5ff', borderRadius: 6 }}>
                          <Text type="secondary">[{seg.type}]</Text>
                          <Text style={{ marginLeft: 8 }}>{seg.content}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Space>
            </Card>
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
