'use client';

import { useState } from 'react';

import type { ModerationPolicy } from '@/features/comments/automation';
import { splitWordList } from '@/features/comments/word-list';
import { PolicyNumberField } from './policy-number-field';
import { PolicyWordDialog } from './policy-word-dialog';
import { RiskScale } from './risk-scale';

export type PolicyDraft = Omit<ModerationPolicy, 'bannedKeywords' | 'blockedNames'> & {
  bannedKeywordsText: string;
  blockedNamesText: string;
};

export function toDraft(policy: ModerationPolicy): PolicyDraft {
  const { bannedKeywords, blockedNames, ...rest } = policy;
  return {
    ...rest,
    bannedKeywordsText: bannedKeywords.join('、'),
    blockedNamesText: blockedNames.join('、'),
  };
}

export function toPolicy(draft: PolicyDraft): ModerationPolicy {
  const { bannedKeywordsText, blockedNamesText, ...rest } = draft;
  return {
    ...rest,
    bannedKeywords: splitWordList(bannedKeywordsText),
    blockedNames: splitWordList(blockedNamesText),
  };
}

export function PolicyFields({
  draft,
  fieldErrors,
  update,
}: {
  draft: PolicyDraft;
  fieldErrors: Record<string, string>;
  update: (values: Partial<PolicyDraft>) => void;
}) {
  const [openWords, setOpenWords] = useState<'banned' | 'blocked' | null>(null);
  const approve = Math.max(0, Math.min(100, draft.autoApproveMaxRisk));
  const block = Math.max(approve, Math.min(100, draft.autoBlockMinRisk));
  const keywordCount = splitWordList(draft.bannedKeywordsText).length;
  const blockedNameCount = splitWordList(draft.blockedNamesText).length;
  const wordTitle = openWords === 'blocked' ? '昵称黑名单' : '违禁关键词';
  const wordValue = openWords === 'blocked' ? draft.blockedNamesText : draft.bannedKeywordsText;
  const wordCount = openWords === 'blocked' ? blockedNameCount : keywordCount;
  const wordError = openWords === 'blocked' ? fieldErrors.blockedNames : fieldErrors.bannedKeywords;
  const wordId = openWords === 'blocked' ? 'blockedNames' : 'bannedKeywords';

  return (
    <div className="automation-form-main">
      <section className="policy-panel" aria-labelledby="policy-decision-title">
        <header className="policy-panel-head">
          <span className="policy-panel-index">01</span>
          <h3 className="policy-panel-title" id="policy-decision-title">
            判定阈值
          </h3>
          <span className="policy-panel-code">DECISION</span>
        </header>

        <div className="policy-check-row">
          <label className="automation-check">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => update({ enabled: event.target.checked })}
            />
            <span>启用自动审核</span>
          </label>
          <label className="automation-check">
            <input
              type="checkbox"
              checked={draft.sweepPendingOnSave}
              onChange={(event) => update({ sweepPendingOnSave: event.target.checked })}
            />
            <span>保存后复核存量待审</span>
          </label>
        </div>

        <div className="policy-threshold-grid">
          <PolicyNumberField
            id="autoApproveMaxRisk"
            label="自动发布上限"
            value={draft.autoApproveMaxRisk}
            min={0}
            max={99}
            unit="RISK ≤"
            error={fieldErrors.autoApproveMaxRisk}
            onChange={(value) => update({ autoApproveMaxRisk: value })}
          />
          <PolicyNumberField
            id="autoBlockMinRisk"
            label="自动拦截下限"
            value={draft.autoBlockMinRisk}
            min={1}
            max={100}
            unit="RISK ≥"
            error={fieldErrors.autoBlockMinRisk}
            onChange={(value) => update({ autoBlockMinRisk: value })}
          />
        </div>

        <div className="policy-choice-row">
          <span className="policy-choice-label">拦截动作</span>
          <div className="policy-choice-group" role="group" aria-label="拦截动作">
            <button
              type="button"
              className="policy-choice"
              aria-pressed={draft.blockAction === 'spam'}
              onClick={() => update({ blockAction: 'spam' })}
            >
              标记垃圾
            </button>
            <button
              type="button"
              className="policy-choice"
              aria-pressed={draft.blockAction === 'rejected'}
              onClick={() => update({ blockAction: 'rejected' })}
            >
              直接拒绝
            </button>
          </div>
        </div>

        <RiskScale approve={approve} block={block} />
      </section>

      <section className="policy-panel" aria-labelledby="policy-boundary-title">
        <header className="policy-panel-head">
          <span className="policy-panel-index">02</span>
          <h3 className="policy-panel-title" id="policy-boundary-title">
            节奏、来源与词表
          </h3>
          <span className="policy-panel-code">BOUNDARIES</span>
        </header>

        <div className="policy-number-grid">
          <PolicyNumberField
            id="minSubmitSeconds"
            label="最短填写时间"
            value={draft.minSubmitSeconds}
            min={0}
            max={300}
            unit="秒"
            error={fieldErrors.minSubmitSeconds}
            onChange={(value) => update({ minSubmitSeconds: value })}
          />
          <PolicyNumberField
            id="maxSubmitAgeMinutes"
            label="表单有效期"
            value={draft.maxSubmitAgeMinutes}
            min={1}
            max={10080}
            unit="分钟"
            error={fieldErrors.maxSubmitAgeMinutes}
            onChange={(value) => update({ maxSubmitAgeMinutes: value })}
          />
          <PolicyNumberField
            id="maxLinks"
            label="链接上限"
            value={draft.maxLinks}
            min={0}
            max={10}
            unit="条"
            error={fieldErrors.maxLinks}
            onChange={(value) => update({ maxLinks: value })}
          />
          <PolicyNumberField
            id="duplicateWindowMinutes"
            label="重复检测窗口"
            value={draft.duplicateWindowMinutes}
            min={0}
            max={1440}
            unit="分钟"
            error={fieldErrors.duplicateWindowMinutes}
            onChange={(value) => update({ duplicateWindowMinutes: value })}
          />
          <PolicyNumberField
            id="duplicateLimit"
            label="重复内容允许次数"
            value={draft.duplicateLimit}
            min={0}
            max={20}
            unit="次"
            error={fieldErrors.duplicateLimit}
            onChange={(value) => update({ duplicateLimit: value })}
          />
          <PolicyNumberField
            id="ipWindowMinutes"
            label="来源频率窗口"
            value={draft.ipWindowMinutes}
            min={1}
            max={1440}
            unit="分钟"
            error={fieldErrors.ipWindowMinutes}
            onChange={(value) => update({ ipWindowMinutes: value })}
          />
          <PolicyNumberField
            id="ipMaxComments"
            label="同来源留言上限"
            value={draft.ipMaxComments}
            min={1}
            max={100}
            unit="条"
            error={fieldErrors.ipMaxComments}
            onChange={(value) => update({ ipMaxComments: value })}
          />
        </div>

        <div className="policy-word-block">
          <div className="policy-disclosure-row">
            <button
              type="button"
              className="policy-disclosure"
              aria-haspopup="dialog"
              aria-controls="policy-word-dialog"
              onClick={() => setOpenWords('banned')}
            >
              <span>违禁关键词</span>
              <span className="policy-disclosure-count">{keywordCount} 项</span>
              <span className="policy-disclosure-sign" aria-hidden="true">
                +
              </span>
            </button>
            <button
              type="button"
              className="policy-disclosure"
              aria-haspopup="dialog"
              aria-controls="policy-word-dialog"
              onClick={() => setOpenWords('blocked')}
            >
              <span>昵称黑名单</span>
              <span className="policy-disclosure-count">{blockedNameCount} 项</span>
              <span className="policy-disclosure-sign" aria-hidden="true">
                +
              </span>
            </button>
          </div>
          {!openWords && fieldErrors.bannedKeywords ? (
            <p className="form-error policy-word-error" role="alert">
              {fieldErrors.bannedKeywords}
            </p>
          ) : null}
          {!openWords && fieldErrors.blockedNames ? (
            <p className="form-error policy-word-error" role="alert">
              {fieldErrors.blockedNames}
            </p>
          ) : null}
        </div>
      </section>

      <PolicyWordDialog
        open={Boolean(openWords)}
        title={wordTitle}
        value={wordValue}
        count={wordCount}
        error={wordError}
        fieldId={wordId}
        onChange={(value) => {
          if (openWords === 'blocked') {
            update({ blockedNamesText: value });
            return;
          }
          update({ bannedKeywordsText: value });
        }}
        onClose={() => setOpenWords(null)}
      />
    </div>
  );
}
