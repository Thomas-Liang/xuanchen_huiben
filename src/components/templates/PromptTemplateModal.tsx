import { useEffect, useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CopyOutlined,
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
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [saving, setSaving] = useState(false);

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
      });
      message.success('模板创建成功');
      setCreateModalVisible(false);
      setNewTemplateName('');
      setNewTemplateContent('');
      setNewTemplateCategory('通用');
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

  const filteredTemplates =
    filterCategory === '全部' ? templates : templates.filter(t => t.category === filterCategory);

  const categories = ['全部', ...presetCategories];

  return (
    <>
      <Modal title="提示词模板" open={visible} onCancel={onClose} footer={null} width={700}>
        <Text type="secondary">
          内置 3 个常用模板，可直接点“使用”填充到主输入框，再替换 {'{变量}'} 内容即可生成。
        </Text>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 120 }}
              options={categories.map(c => ({ value: c, label: c }))}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建模板
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
                style={{ marginBottom: 12 }}
                actions={[
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleUseTemplate(template)}
                    key="use"
                  >
                    使用
                  </Button>,
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(template)}
                    key="edit"
                  >
                    编辑
                  </Button>,
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
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      <FileTextOutlined />
                      <span>{template.name}</span>
                      <Tag color="blue">{template.category}</Tag>
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
