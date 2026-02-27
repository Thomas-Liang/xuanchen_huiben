import { useState, useRef, useEffect } from 'react';
import { App } from 'antd';
import {
  ConfigProvider,
  Layout,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  Modal,
  Radio,
  Tabs,
  List,
  Image,
  Select,
  Progress,
  Row,
  Col,
  Divider,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  RobotOutlined,
  UploadOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  SettingOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type {
  ParsedPrompt,
  CharacterBinding,
  ImageGenerationParams,
  ImageGenerationResult,
  APIConfig,
  GenerationConfig,
} from './types';
import * as api from './api';
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
  time: { color: '#ec4899', icon: <AppstoreOutlined /> },
  weather: { color: '#06b6d4', icon: <AppstoreOutlined /> },
  style: { color: '#f97316', icon: <AppstoreOutlined /> },
  other: { color: '#64748b', icon: <RobotOutlined /> },
};

function MainApp() {
  const { message } = App.useApp();
  const [prompt, setPrompt] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [bindingModalVisible, setBindingModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [imageType, setImageType] = useState<'人物' | '场景'>('人物');
  const [bindingLoading, setBindingLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [referenceImageLibrary, setReferenceImageLibrary] = useState<CharacterBinding[]>([]);
  const dragCounter = useRef(0);

  const [selectedModel, setSelectedModel] = useState<'seedream' | 'banana_pro'>('seedream');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 512,
    height: 512,
  });
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<'standard' | 'high' | 'ultra'>('standard');
  const [seedreamSize, setSeedreamSize] = useState<string>('1024x1024');
  const [sequentialImageGeneration, setSequentialImageGeneration] = useState<'auto' | 'disabled'>(
    'disabled'
  );
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>('url');
  const [watermark, setWatermark] = useState<string>('false');
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState<ImageGenerationResult | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [characterBindings, setCharacterBindings] = useState<Record<string, CharacterBinding>>({});
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    seedream: { baseUrl: '', apiKey: '' },
    bananaPro: { baseUrl: '', apiKey: '' },
  });
  const [testingApi, setTestingApi] = useState<'seedream' | 'banana_pro' | null>(null);

  useEffect(() => {
    console.log('App loaded, checking Tauri...');
    loadApiConfig();
    loadGenerationConfig();
  }, []);

  const loadApiConfig = async () => {
    try {
      const config = await api.getDefaultApiConfig();
      setApiConfig(config);
    } catch (error) {
      console.error('加载API配置失败:', error);
    }
  };

  const loadGenerationConfig = async () => {
    try {
      const config = await api.loadGenerationConfig();
      if (config.model === 'seedream' || config.model === 'banana_pro') {
        setSelectedModel(config.model);
      }
      setImageSize({ width: config.width, height: config.height });
      setImageCount(config.count);
      setImageQuality(config.quality as 'standard' | 'high' | 'ultra');
      if (config.size) setSeedreamSize(config.size);
      if (config.sequential_image_generation)
        setSequentialImageGeneration(config.sequential_image_generation as 'auto' | 'disabled');
      if (config.response_format) setResponseFormat(config.response_format as 'url' | 'b64_json');
      if (config.watermark !== undefined) setWatermark(config.watermark.toString());
    } catch (error) {
      console.log('使用默认生成参数配置');
    }
  };

  const handleParse = async () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }

    setLoading(true);
    try {
      const result = await api.parsePrompt(prompt);
      setParsedResult(result);

      const bindings = await api.getBindingsForPrompt(result.characters.map(c => c.name));

      const bindingMap: Record<string, CharacterBinding> = {};
      bindings.forEach(b => {
        bindingMap[b.characterName] = b;
      });
      setCharacterBindings(bindingMap);

      const updatedCharacters = result.characters.map(c => ({
        ...c,
        bound: !!bindingMap[c.name],
      }));
      setParsedResult({ ...result, characters: updatedCharacters });

      message.success('解析成功');
    } catch (error) {
      message.error(`解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = event => {
          const result = event.target?.result as string;
          setUploadedImage(result);
        };
        reader.readAsDataURL(file);
      } else {
        message.warning('请上传图片文件');
      }
    }
  };

  const openBindingModal = async (characterName: string) => {
    setSelectedCharacter(characterName);
    setUploadedImage('');
    setActiveTab('upload');
    setBindingModalVisible(true);

    // 暂时跳过API调用
    setReferenceImageLibrary([]);
  };

  const handleSelectFromLibrary = (binding: CharacterBinding) => {
    const path = binding.referenceImagePath?.replace(/^file:\/\//, '') || '';
    setUploadedImage(path);
    setImageType(binding.imageType as '人物' | '场景');
    message.success(`已选择角色 @${binding.characterName} 的参考图`);
  };

  const handleBindSubmit = async () => {
    if (!selectedCharacter) {
      message.warning('请选择角色');
      return;
    }

    if (!uploadedImage) {
      message.warning('请上传参考图');
      return;
    }

    setBindingLoading(true);
    try {
      let binding;
      if (uploadedImage.startsWith('data:')) {
        const base64Data = uploadedImage.split(',')[1];
        binding = await api.saveReferenceImage(selectedCharacter, base64Data, imageType);
      } else {
        binding = await api.bindCharacterReference(selectedCharacter, uploadedImage, imageType);
      }

      setCharacterBindings(prev => ({
        ...prev,
        [selectedCharacter]: {
          characterName: binding.characterName,
          referenceImagePath: binding.referenceImagePath,
          imageType: binding.imageType,
          createdAt: binding.createdAt,
          bound: true,
        },
      }));

      if (parsedResult) {
        const updatedCharacters = parsedResult.characters.map(c =>
          c.name === selectedCharacter ? { ...c, bound: true } : c
        );
        setParsedResult({ ...parsedResult, characters: updatedCharacters });
      }

      message.success(`角色 @${selectedCharacter} 绑定成功`);
      setBindingModalVisible(false);
    } catch (error) {
      message.error(`绑定失败: ${error}`);
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbind = async (characterName: string) => {
    // 暂时跳过API调用
    setCharacterBindings(prev => {
      const newBindings = { ...prev };
      delete newBindings[characterName];
      return newBindings;
    });

    if (parsedResult) {
      const updatedCharacters = parsedResult.characters.map(c =>
        c.name === characterName ? { ...c, bound: false } : c
      );
      setParsedResult({ ...parsedResult, characters: updatedCharacters });
    }

    message.success(`角色 @${characterName} 已解绑`);
  };

  const handleGenerate = async () => {
    if (!parsedResult) {
      message.warning('请先解析提示词');
      return;
    }

    setGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    try {
      const params: ImageGenerationParams = {
        model: selectedModel,
        prompt: parsedResult.original,
        characterBindings: Object.values(characterBindings).map(b => ({
          character_name: b.characterName,
          reference_image_path: b.referenceImagePath,
          image_type: b.imageType,
        })),
        width: imageSize.width,
        height: imageSize.height,
        count: imageCount,
        quality: imageQuality,
        watermark: selectedModel === 'seedream' ? watermark === 'true' : undefined,
      };

      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const result = await api.generateImage(params);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationResult(result);

      if (result.success) {
        message.success('图片生成成功！');
      } else {
        message.error(`生成失败: ${result.error}`);
      }
    } catch (error) {
      message.error(`生成失败: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await api.saveApiConfig(apiConfig);
      message.success('API配置保存成功');
      setConfigModalVisible(false);
    } catch (error) {
      message.error(`保存失败: ${error}`);
    }
  };

  const handleTestApi = async (model: 'seedream' | 'banana_pro') => {
    setTestingApi(model);
    try {
      const config = model === 'banana_pro' ? apiConfig.bananaPro : apiConfig.seedream;
      await api.testApiConnection(model, config.baseUrl, config.apiKey);
      message.success(`${model === 'seedream' ? 'Seeddream' : 'Banana Pro'} API连接成功`);
    } catch (error) {
      message.error(`连接失败: ${error}`);
    } finally {
      setTestingApi(null);
    }
  };

  const handleSaveGenerationConfig = async () => {
    try {
      const config: GenerationConfig = {
        model: selectedModel,
        width: imageSize.width,
        height: imageSize.height,
        count: imageCount,
        quality: imageQuality,
        size: selectedModel === 'seedream' ? seedreamSize : undefined,
        sequential_image_generation:
          selectedModel === 'seedream' ? sequentialImageGeneration : undefined,
        response_format: selectedModel === 'seedream' ? responseFormat : undefined,
        watermark: selectedModel === 'seedream' ? watermark === 'true' : false,
      };
      await api.saveGenerationConfig(config);
      message.success('生成参数配置已保存为默认');
    } catch (error) {
      message.error(`保存失败: ${error}`);
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
            <Card className="prompt-card" variant="borderless">
              <div className="card-header">
                <Title level={5} className="card-title">
                  输入提示词
                </Title>
                <Text type="secondary">使用 @角色名 绑定参考图</Text>
              </div>
              <TextArea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
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
                <Text type="secondary" className="example-label">
                  试试看：
                </Text>
                <Space wrap>
                  {examplePrompts.map((example, idx) => (
                    <Tag key={idx} className="example-tag" onClick={() => setPrompt(example)}>
                      {example.slice(0, 20)}...
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>

            <Spin spinning={loading}>
              {parsedResult ? (
                <div className="results-container">
                  <Card className="result-card original-card" variant="borderless">
                    <div className="card-header">
                      <Title level={5} className="card-title">
                        原始提示词
                      </Title>
                    </div>
                    <Paragraph className="original-text" copyable>
                      {parsedResult.original}
                    </Paragraph>
                  </Card>

                  <div className="results-grid">
                    {parsedResult.characters.length > 0 && (
                      <Card className="result-card" variant="borderless">
                        <div className="card-header">
                          <UserOutlined />
                          <Title level={5} className="card-title">
                            角色
                          </Title>
                          <Tag color="blue">{parsedResult.characters.length}</Tag>
                        </div>
                        <div className="character-list">
                          {parsedResult.characters.map((char, idx) => {
                            const binding = characterBindings[char.name];
                            return (
                              <div key={idx} className="character-item">
                                <div className="character-avatar">
                                  {binding?.referenceImagePath ? (
                                    <img
                                      src={api.getImageUrl(binding.referenceImagePath)}
                                      alt={char.name}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '50%',
                                      }}
                                    />
                                  ) : (
                                    char.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="character-info">
                                  <Text strong>@{char.name}</Text>
                                  <Tag
                                    color={char.bound ? 'green' : 'default'}
                                    className="bind-tag"
                                    icon={char.bound ? <CheckCircleFilled /> : null}
                                  >
                                    {char.bound ? '已绑定' : '未绑定'}
                                  </Tag>
                                </div>
                                <div className="character-actions">
                                  {char.bound ? (
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleUnbind(char.name)}
                                    >
                                      解绑
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<UploadOutlined />}
                                      onClick={() => openBindingModal(char.name)}
                                    >
                                      绑定参考图
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}

                    {parsedResult.segments.length > 0 && (
                      <Card className="result-card" variant="borderless">
                        <div className="card-header">
                          <AppstoreOutlined />
                          <Title level={5} className="card-title">
                            内容分段
                          </Title>
                          <Tag color="purple">{parsedResult.segments.length}</Tag>
                        </div>
                        <div className="segment-list">
                          {parsedResult.segments.map((seg, idx) => {
                            const tagInfo = segmentTags[seg.type] || segmentTags.other;
                            return (
                              <div key={idx} className="segment-item">
                                <Tag
                                  color={tagInfo.color}
                                  icon={tagInfo.icon}
                                  className="segment-tag"
                                >
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
                    <Card className="result-card" variant="borderless">
                      <Empty
                        description="未检测到角色或分段"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Card>
                  )}

                  <Card className="result-card generate-card" variant="borderless">
                    <div className="card-header">
                      <RobotOutlined />
                      <Title level={5} className="card-title">
                        AI生成
                      </Title>
                      <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setConfigModalVisible(true)}
                        style={{ marginLeft: 'auto' }}
                      >
                        API配置
                      </Button>
                    </div>

                    <div className="generate-settings">
                      <Row gutter={16}>
                        <Col span={8}>
                          <Text strong>选择模型：</Text>
                          <Select
                            value={selectedModel}
                            onChange={setSelectedModel}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'seedream', label: 'Seeddream 4.5' },
                              { value: 'banana_pro', label: 'Banana Pro' },
                            ]}
                          />
                        </Col>
                        {selectedModel === 'seedream' ? (
                          <>
                            <Col span={8}>
                              <Text strong>图片尺寸：</Text>
                              <Select
                                value={seedreamSize}
                                onChange={setSeedreamSize}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: '1024x1024', label: '1K (1024x1024)' },
                                  { value: '2048x2048', label: '2K (2048x2048)' },
                                  { value: '4096x4096', label: '4K (4096x4096)' },
                                ]}
                              />
                            </Col>
                            <Col span={8}>
                              <Text strong>组图功能：</Text>
                              <Select
                                value={sequentialImageGeneration}
                                onChange={setSequentialImageGeneration}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 'disabled', label: '关闭' },
                                  { value: 'auto', label: '自动' },
                                ]}
                              />
                            </Col>
                            <Col span={8}>
                              <Text strong>返回格式：</Text>
                              <Select
                                value={responseFormat}
                                onChange={setResponseFormat}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 'url', label: 'URL链接' },
                                  { value: 'b64_json', label: 'Base64' },
                                ]}
                              />
                            </Col>
                            <Col span={8}>
                              <Text strong>水印：</Text>
                              <Select
                                value={watermark}
                                onChange={setWatermark}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 'false', label: '无水印' },
                                  { value: 'true', label: '有水印' },
                                ]}
                              />
                            </Col>
                          </>
                        ) : (
                          <>
                            <Col span={8}>
                              <Text strong>图片尺寸：</Text>
                              <Select
                                value={`${imageSize.width}x${imageSize.height}`}
                                onChange={value => {
                                  const [w, h] = value.split('x').map(Number);
                                  setImageSize({ width: w, height: h });
                                }}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: '1024x1024', label: '1K (1024x1024)' },
                                  { value: '2048x2048', label: '2K (2048x2048)' },
                                  { value: '4096x4096', label: '4K (4096x4096)' },
                                ]}
                              />
                            </Col>
                            <Col span={8}>
                              <Text strong>生成数量：</Text>
                              <Select
                                value={imageCount}
                                onChange={setImageCount}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 1, label: '1张' },
                                  { value: 2, label: '2张' },
                                  { value: 4, label: '4张' },
                                ]}
                              />
                            </Col>
                            <Col span={8}>
                              <Text strong>图片质量：</Text>
                              <Select
                                value={imageQuality}
                                onChange={setImageQuality}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 'standard', label: '标准' },
                                  { value: 'high', label: '高清' },
                                  { value: 'ultra', label: '超清' },
                                ]}
                              />
                            </Col>
                          </>
                        )}
                      </Row>

                      <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <Button
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={handleSaveGenerationConfig}
                        >
                          保存为默认配置
                        </Button>
                      </div>

                      <Divider style={{ margin: '16px 0' }} />

                      <div className="generate-actions">
                        <Button
                          type="primary"
                          size="large"
                          icon={<RobotOutlined />}
                          onClick={handleGenerate}
                          loading={generating}
                          disabled={!parsedResult}
                        >
                          {generating ? '生成中...' : '开始生成'}
                        </Button>

                        {generating && (
                          <Progress
                            percent={generationProgress}
                            status="active"
                            style={{ marginLeft: 16, width: 200 }}
                          />
                        )}
                      </div>
                    </div>
                  </Card>

                  {generationResult && (
                    <Card className="result-card" variant="borderless">
                      <div className="card-header">
                        <Title level={5} className="card-title">
                          生成结果
                        </Title>
                        {generationResult.success && <Tag color="green">成功</Tag>}
                        {!generationResult.success && <Tag color="red">失败</Tag>}
                      </div>

                      {generationResult.success ? (
                        <Row gutter={16}>
                          {generationResult.images.map((img, idx) => (
                            <Col key={idx} span={12}>
                              <Image
                                src={img}
                                alt={`生成图片 ${idx + 1}`}
                                style={{ width: '100%', borderRadius: 8 }}
                              />
                              <Button
                                type="link"
                                icon={<DownloadOutlined />}
                                href={img}
                                target="_blank"
                                style={{ marginTop: 8 }}
                              >
                                下载
                              </Button>
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <Alert
                          message="生成失败"
                          description={generationResult.error}
                          type="error"
                          showIcon
                        />
                      )}
                    </Card>
                  )}
                </div>
              ) : (
                !loading && (
                  <Card className="result-card empty-card" variant="borderless">
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

      <Modal
        title={`绑定角色 @${selectedCharacter} 的参考图`}
        open={bindingModalVisible}
        onCancel={() => setBindingModalVisible(false)}
        footer={null}
        width={600}
      >
        <div className="binding-modal-content">
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as 'upload' | 'library')}
            items={[
              {
                key: 'upload',
                label: '上传图片',
                children: (
                  <>
                    <div className="image-type-selection">
                      <Text strong>参考图类型：</Text>
                      <Radio.Group
                        value={imageType}
                        onChange={e => setImageType(e.target.value)}
                        style={{ marginLeft: 16 }}
                      >
                        <Radio value="人物">人物</Radio>
                        <Radio value="场景">场景</Radio>
                      </Radio.Group>
                    </div>

                    <div
                      className="image-upload-section"
                      style={{ marginTop: 16 }}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <input
                        key={`file-input-${selectedCharacter}-${Date.now()}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <div
                          className="upload-trigger"
                          style={{
                            border: `2px dashed ${isDragging ? '#1890ff' : '#d9d9d9'}`,
                            borderRadius: 8,
                            padding: 40,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: uploadedImage ? '#f5f5f5' : '#fafafa',
                            transition: 'all 0.3s',
                          }}
                        >
                          {uploadedImage ? (
                            <div style={{ position: 'relative' }}>
                              <img
                                src={api.getImageUrl(uploadedImage)}
                                alt="预览"
                                style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 4 }}
                              />
                              {isDragging && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(24, 144, 255, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text strong style={{ color: '#fff', fontSize: 18 }}>
                                    释放以上传
                                  </Text>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <UploadOutlined
                                style={{ fontSize: 32, color: isDragging ? '#1890ff' : '#999' }}
                              />
                              <div style={{ marginTop: 8, color: isDragging ? '#1890ff' : '#999' }}>
                                点击选择图片 或 拖拽图片到这里
                              </div>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </>
                ),
              },
              {
                key: 'library',
                label: '从图库选择',
                children: (
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {referenceImageLibrary.length > 0 ? (
                      <List
                        grid={{ gutter: 16, column: 2 }}
                        dataSource={referenceImageLibrary}
                        renderItem={item => (
                          <List.Item>
                            <div
                              onClick={() => handleSelectFromLibrary(item)}
                              style={{
                                cursor: 'pointer',
                                border: '2px solid #f0f0f0',
                                borderRadius: 8,
                                padding: 4,
                                transition: 'all 0.3s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#1890ff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#f0f0f0';
                              }}
                            >
                              <Image
                                src={api.getImageUrl(item.referenceImagePath)}
                                alt={item.characterName}
                                style={{
                                  width: '100%',
                                  height: 120,
                                  objectFit: 'cover',
                                  borderRadius: 4,
                                }}
                              />
                              <div style={{ marginTop: 8, textAlign: 'center' }}>
                                <Tag color={item.imageType === '人物' ? 'blue' : 'green'}>
                                  {item.imageType}
                                </Tag>
                                <Text strong>@{item.characterName}</Text>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        description="暂无已保存的参考图"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />

          <div className="binding-actions" style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => setBindingModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleBindSubmit}
              loading={bindingLoading}
              disabled={!uploadedImage}
            >
              确认绑定
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="API配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={handleSaveConfig}
        okText="保存"
      >
        <div style={{ padding: '16px 0' }}>
          <Divider>Seeddream API</Divider>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Base URL:</Text>
            <Input
              value={apiConfig.seedream.baseUrl}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  seedream: { ...apiConfig.seedream, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.zhongzhuan.chat"
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>API Key:</Text>
            <Input.Password
              value={apiConfig.seedream.apiKey}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  seedream: { ...apiConfig.seedream, apiKey: e.target.value },
                })
              }
              placeholder="请输入API Key"
              style={{ marginTop: 4 }}
            />
            <Button
              type="link"
              onClick={() => handleTestApi('seedream')}
              loading={testingApi === 'seedream'}
              style={{ marginTop: 4, padding: 0 }}
            >
              测试连接
            </Button>
          </div>

          <Divider>Banana Pro API</Divider>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Base URL:</Text>
            <Input
              value={apiConfig.bananaPro.baseUrl}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  bananaPro: { ...apiConfig.bananaPro, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.bananaprostudio.com"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>API Key:</Text>
            <Input.Password
              value={apiConfig.bananaPro.apiKey}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  bananaPro: { ...apiConfig.bananaPro, apiKey: e.target.value },
                })
              }
              placeholder="请输入API Key"
              style={{ marginTop: 4 }}
            />
            <Button
              type="link"
              onClick={() => handleTestApi('banana_pro')}
              loading={testingApi === 'banana_pro'}
              style={{ marginTop: 4, padding: 0 }}
            >
              测试连接
            </Button>
          </div>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

export default MainApp;
