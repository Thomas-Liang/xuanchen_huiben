import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  Button,
  List,
  Card,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Empty,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CopyOutlined,
  StarOutlined,
  StarFilled,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { PromptTemplate } from '../../types';
import * as api from '../../api';

const { Text } = Typography;

interface PromptTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (content: string) => void;
}

const presetCategories = ['人物', '场景', '风格', '通用', '其他'];

export function PromptTemplateModal({
  visible,
  onClose,
  onSelectTemplate,
}: PromptTemplateModalProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('通用');
  const [newTemplateGroup, setNewTemplateGroup] = useState('默认');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [filterGroup, setFilterGroup] = useState<string>('全部');
  const [sortByFavorite, setSortByFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getAllPromptTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      message.warning('请输入模板名称');
      return;
    }
    if (!newTemplateContent.trim()) {
      message.warning('请输入模板内容');
      return;
    }

    setSaving(true);
    try {
      await api.addPromptTemplate({
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
        category: newTemplateCategory,
        group: newTemplateGroup,
      });
      message.success('模板创建成功');
      setCreateModalVisible(false);
      setNewTemplateName('');
      setNewTemplateContent('');
      setNewTemplateCategory('通用');
      setNewTemplateGroup('默认');
      loadTemplates();
    } catch (error) {
      console.error('创建模板失败:', error);
      message.error(`创建失败: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      message.warning('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      await api.updatePromptTemplate(editingTemplate.id, {
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
        category: newTemplateCategory,
      });
      message.success('模板更新成功');
      setEditModalVisible(false);
      setEditingTemplate(null);
      setNewTemplateName('');
      setNewTemplateContent('');
      setNewTemplateCategory('通用');
      loadTemplates();
    } catch (error) {
      console.error('更新模板失败:', error);
      message.error(`更新失败: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.deletePromptTemplate(id);
      message.success('模板删除成功');
      loadTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      message.error(`删除失败: ${error}`);
    }
  };

  const handleUseTemplate = async (template: PromptTemplate) => {
    try {
      await api.incrementTemplateUsage(template.id);
      onSelectTemplate(template.content);
      onClose();
    } catch (error) {
      console.error('使用模板失败:', error);
      onSelectTemplate(template.content);
      onClose();
    }
  };

  const openEditModal = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateContent(template.content);
    setNewTemplateCategory(template.category);
    setEditModalVisible(true);
  };

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (filterCategory !== '全部') {
      result = result.filter(t => t.category === filterCategory);
    }

    if (filterGroup !== '全部') {
      result = result.filter(t => t.group === filterGroup);
    }

    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        t => t.name.toLowerCase().includes(kw) || t.content.toLowerCase().includes(kw)
      );
    }

    if (sortByFavorite) {
      result = [...result].sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return b.usage_count - a.usage_count;
      });
    }

    return result;
  }, [templates, filterCategory, filterGroup, searchKeyword, sortByFavorite]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['全部', ...Array.from(cats)];
  }, [templates]);

  const groups = useMemo(() => {
    const gps = new Set(templates.map(t => t.group).filter(Boolean));
    return ['全部', ...Array.from(gps)];
  }, [templates]);

  const handleToggleFavorite = async (template: PromptTemplate) => {
    try {
      await api.updatePromptTemplateFavorite(template.id, !template.is_favorite);
      loadTemplates();
    } catch (error) {
      message.error(`操作失败: ${error}`);
    }
  };

  const handleExport = async () => {
    if (selectedTemplates.length === 0) {
      message.warning('请选择要导出的模板');
      return;
    }
    try {
      const json = await api.exportPromptTemplates(selectedTemplates);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'templates.json';
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error(`导出失败: ${error}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const json = event.target?.result as string;
        const result = await api.importPromptTemplates(json, 'skip');
        message.success(`导入完成：成功 ${result.imported}，跳过 ${result.skipped}`);
        loadTemplates();
      } catch (error) {
        message.error(`导入失败: ${error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplates(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(t => t.id));
    }
  };

  const handleCopyTemplate = (template: PromptTemplate) => {
    const newName = `${template.name} (副本)`;
    api
      .addPromptTemplate({
        name: newName,
        content: template.content,
        category: template.category,
        group: template.group,
      })
      .then(() => {
        message.success('模板已复制');
        loadTemplates();
      })
      .catch(err => message.error(`复制失败: ${err}`));
  };

  return (
    <>
      <Modal title="提示词模板" open={visible} onCancel={onClose} footer={null} width={800}>
        <Text type="secondary">内置模板只读，可复制后修改。支持分组管理、收藏、导入导出。</Text>
        <div style={{ marginBottom: 16, marginTop: 16 }}>
          <Space wrap>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 100 }}
              options={categories.map(c => ({ value: c, label: c }))}
            />
            <Select
              value={filterGroup}
              onChange={setFilterGroup}
              style={{ width: 100 }}
              placeholder="分组"
              allowClear
              options={groups.map(g => ({ value: g, label: g }))}
            />
            <Button
              icon={sortByFavorite ? <StarFilled /> : <StarOutlined />}
              onClick={() => setSortByFavorite(!sortByFavorite)}
              type={sortByFavorite ? 'primary' : 'default'}
            >
              收藏优先
            </Button>
            <Input
              placeholder="搜索模板..."
              allowClear
              style={{ width: 150 }}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
            />
          </Space>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              新建模板
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => document.getElementById('import-input')?.click()}
            >
              导入
            </Button>
            <input
              id="import-input"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={selectedTemplates.length === 0}
            >
              导出({selectedTemplates.length})
            </Button>
            <Button onClick={handleSelectAll}>
              {selectedTemplates.length === templates.length ? '取消全选' : '全选'}
            </Button>
          </Space>
        </div>

        {filteredTemplates.length > 0 ? (
          <List
            loading={loading}
            dataSource={filteredTemplates}
            renderItem={template => (
              <Card
                size="small"
                style={{
                  marginBottom: 12,
                  border: selectedTemplates.includes(template.id) ? '2px solid #1890ff' : undefined,
                }}
                extra={
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onChange={() => handleSelectTemplate(template.id)}
                  />
                }
                actions={[
                  <Button
                    type="text"
                    icon={
                      template.is_favorite ? (
                        <StarFilled style={{ color: '#faad14' }} />
                      ) : (
                        <StarOutlined />
                      )
                    }
                    onClick={() => handleToggleFavorite(template)}
                    key="favorite"
                  >
                    {template.is_favorite ? '已收藏' : '收藏'}
                  </Button>,
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyTemplate(template)}
                    key="copy"
                  >
                    复制
                  </Button>,
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleUseTemplate(template)}
                    key="use"
                  >
                    使用
                  </Button>,
                  !template.is_builtin && (
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(template)}
                      key="edit"
                    >
                      编辑
                    </Button>
                  ),
                  !template.is_builtin && (
                    <Popconfirm
                      title="确认删除"
                      description="确定要删除这个模板吗？"
                      onConfirm={() => handleDeleteTemplate(template.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} key="delete">
                        删除
                      </Button>
                    </Popconfirm>
                  ),
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={
                    <Space>
                      {template.is_builtin && <Tag color="purple">内置</Tag>}
                      <FileTextOutlined />
                      <span>{template.name}</span>
                      <Tag color="blue">{template.category}</Tag>
                      {template.group && template.group !== '默认' && (
                        <Tag color="green">{template.group}</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text
                        type="secondary"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {template.content}
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {template.variables.length > 0 && (
                          <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              变量:
                            </Text>
                            {template.variables.map(v => (
                              <Tag key={v} style={{ margin: 0 }}>
                                {`{${v}}`}
                              </Tag>
                            ))}
                          </Space>
                        )}
                        <Text type="secondary" style={{ fontSize: 12, float: 'right' }}>
                          使用次数: {template.usage_count}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </Card>
            )}
          />
        ) : (
          <Empty description="暂无模板，点击上方新建模板" />
        )}
      </Modal>

      <Modal
        title="新建模板"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewTemplateName('');
          setNewTemplateContent('');
          setNewTemplateCategory('通用');
          setNewTemplateGroup('默认');
        }}
        onOk={handleCreateTemplate}
        confirmLoading={saving}
        okText="创建"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text strong>模板名称：</Text>
            <Input
              style={{ marginTop: 8 }}
              placeholder="请输入模板名称"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
            />
          </div>
          <div>
            <Text strong>分类：</Text>
            <Select
              style={{ marginTop: 8, width: '100%' }}
              value={newTemplateCategory}
              onChange={setNewTemplateCategory}
              options={presetCategories.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <Text strong>分组：</Text>
            <Select
              style={{ marginTop: 8, width: '100%' }}
              value={newTemplateGroup}
              onChange={setNewTemplateGroup}
              allowClear
              placeholder="选择分组或不选"
              options={[
                { value: '默认', label: '默认' },
                { value: '我的分组', label: '我的分组' },
                { value: '工作', label: '工作' },
                { value: '学习', label: '学习' },
              ]}
            />
          </div>
          <div>
            <Text strong>模板内容：</Text>
            <Input.TextArea
              style={{ marginTop: 8 }}
              placeholder="使用 {变量名} 格式定义变量，如：在{地点}的{人物}正在{动作}"
              value={newTemplateContent}
              onChange={e => setNewTemplateContent(e.target.value)}
              rows={4}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：使用 {'{变量名}'} 格式可以定义变量
            </Text>
          </div>
        </div>
      </Modal>

      <Modal
        title="编辑模板"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTemplate(null);
          setNewTemplateName('');
          setNewTemplateContent('');
          setNewTemplateCategory('通用');
        }}
        onOk={handleUpdateTemplate}
        confirmLoading={saving}
        okText="保存"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text strong>模板名称：</Text>
            <Input
              style={{ marginTop: 8 }}
              placeholder="请输入模板名称"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
            />
          </div>
          <div>
            <Text strong>分类：</Text>
            <Select
              style={{ marginTop: 8, width: '100%' }}
              value={newTemplateCategory}
              onChange={setNewTemplateCategory}
              options={presetCategories.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <Text strong>模板内容：</Text>
            <Input.TextArea
              style={{ marginTop: 8 }}
              placeholder="使用 {变量名} 格式定义变量"
              value={newTemplateContent}
              onChange={e => setNewTemplateContent(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

export default PromptTemplateModal;
