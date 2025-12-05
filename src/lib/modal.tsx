import Image from 'next/image';
import { Modal } from 'antd';

/**
 * 统一的 Modal 弹窗工具
 * 提供七种常用的提示和确认方法
 */

interface ModalOptions {
    title: string;
    content: string;
    okText?: string;
    onOk?: () => void;
}

interface ConfirmOptions {
    title: string;
    content: string;
    onOk: () => void;
    onCancel?: () => void;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ImageConfirmOptions {
    imageFile: File;
    onOk: () => void;
    onCancel?: () => void;
    title?: string;
    okText?: string;
    cancelText?: string;
}

/**
 * 成功提示 (绿色勾选图标)
 */
export const showSuccess = ({ title, content, okText = '确定', onOk }: ModalOptions) => {
    Modal.success({
        title,
        content,
        centered: true,
        okText,
        onOk,
    });
};

/**
 * 信息提示 (蓝色信息图标)
 */
export const showInfo = ({ title, content, okText = '知道了', onOk }: ModalOptions) => {
    Modal.info({
        title,
        content,
        centered: true,
        okText,
        onOk,
    });
};

/**
 * 警告提示 (黄色警告图标)
 */
export const showWarning = ({ title, content, okText = '确定', onOk }: ModalOptions) => {
    Modal.warning({
        title,
        content,
        centered: true,
        okText,
        onOk,
    });
};

/**
 * 错误提示 (红色错误图标)
 */
export const showError = ({ title, content, okText = '确定', onOk }: ModalOptions) => {
    Modal.error({
        title,
        content,
        centered: true,
        okText,
        onOk,
    });
};

/**
 * 确认对话框 (用于需要用户确认的操作)
 */
export const showConfirm = ({
    title,
    content,
    onOk,
    onCancel,
    okText = '确定',
    cancelText = '取消',
    danger = false
}: ConfirmOptions) => {
    Modal.confirm({
        title,
        content,
        centered: true,
        okText,
        cancelText,
        onOk,
        onCancel,
        okButtonProps: danger ? { danger: true } : undefined,
    });
};

/**
 * 通用提示框 (简单的信息展示，只有确定按钮)
 * 用于替代简单的 Modal 组件使用
 */
export const showAlert = ({ title, content, okText = '确定', onOk }: ModalOptions) => {
    Modal.info({
        title,
        content,
        centered: true,
        okText,
        onOk,
        icon: null, // 不显示图标，更接近原生 alert
    });
};

/**
 * 图片确认对话框 (用于发送图片前的预览确认)
 */
export const showImageConfirm = ({
    imageFile,
    onOk,
    onCancel,
    title = '发送图片',
    okText = '发送',
    cancelText = '取消'
}: ImageConfirmOptions) => {
    const previewUrl = URL.createObjectURL(imageFile);

    const cleanup = () => URL.revokeObjectURL(previewUrl);

    Modal.confirm({
        title,
        centered: true,
        width: 480,
        icon: null,
        okText,
        cancelText,
        onOk: () => {
            cleanup();
            onOk();
        },
        onCancel: () => {
            cleanup();
            onCancel?.();
        },
        content: (
            <div style={{ textAlign: 'center' }}>
                <Image
                    src={previewUrl}
                    alt="图片预览"
                    width={432}
                    height={400}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        width: 'auto',
                        height: 'auto',
                        borderRadius: '8px',
                        marginBottom: '12px'
                    }}
                />
                <div style={{ color: '#666', fontSize: '14px' }}>
                    确定要发送这张图片吗？
                </div>
            </div>
        ),
    });
};
