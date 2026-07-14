/**
 * dialog-form.tsx - DialogForm 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用对话框表单骨架，统一标题、说明、内容和页脚操作。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import type { ButtonVariant } from "./Button.types";

export interface DialogFormProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Dialog>,
  "children"
> {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly submitLabel?: React.ReactNode;
  readonly cancelLabel?: React.ReactNode;
  readonly submitVariant?: ButtonVariant;
  readonly cancelVariant?: ButtonVariant;
  readonly submitting?: boolean;
  readonly submitDisabled?: boolean;
  readonly contentClassName?: string;
  readonly formClassName?: string;
  readonly onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

function DialogForm({
  title,
  description,
  children,
  footer,
  submitLabel = "保存",
  cancelLabel = "取消",
  submitVariant = "default",
  cancelVariant = "outline",
  submitting = false,
  submitDisabled = false,
  contentClassName,
  formClassName,
  onSubmit,
  onOpenChange,
  ...props
}: DialogFormProps) {
  const defaultFooter = (
    <>
      <Button
        variant={cancelVariant}
        onClick={() => onOpenChange?.(false)}
        disabled={submitting}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        variant={submitVariant}
        disabled={submitDisabled || submitting}
      >
        {submitting ? "处理中..." : submitLabel}
      </Button>
    </>
  );

  return (
    <Dialog
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
      {...props}
    >
      <DialogContent
        className={cn("vx-dialog-form max-w-2xl", contentClassName)}
      >
        <form className={cn("grid gap-5", formClassName)} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          {children ? <div className="grid gap-4">{children}</div> : null}
          <DialogFooter>{footer ?? defaultFooter}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { DialogForm };
