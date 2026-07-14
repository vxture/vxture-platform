/**
 * settings-split-page.tsx - 设置页左右分栏 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { PageStack } from "./PageStack";

export interface SettingsSplitPageProps {
  readonly header: React.ReactNode;
  readonly navigation: React.ReactNode;
  readonly content: React.ReactNode;
}

export function SettingsSplitPage({
  header,
  navigation,
  content,
}: SettingsSplitPageProps) {
  return (
    <PageStack>
      {header}
      <div className="vx-settings-split-page">
        <aside className="vx-settings-split-page__nav">{navigation}</aside>
        <div className="vx-settings-split-page__content">{content}</div>
      </div>
    </PageStack>
  );
}
