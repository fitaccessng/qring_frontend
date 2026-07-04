import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficeIncomingCallModal from "../../../components/office/OfficeIncomingCallModal";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import OfficeChatSurface from "../../../components/office/OfficeChatSurface";
import OfficeMessageRow from "../../../components/office/OfficeMessageRow";
import OfficeCallActions from "../../../components/office/OfficeCallActions";
import OfficeStatusPill from "../../../components/office/OfficeStatusPill";
import OfficeActiveVoiceCall from "../../../components/office/OfficeActiveVoiceCall";
import OfficeActiveVideoCall from "../../../components/office/OfficeActiveVideoCall";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { officeTabs } from "./officeNav";
import { useSessionRealtime } from "../../../hooks/useSessionRealtime";
import {
  getConversationMessageText,
  getConversationPreviewText
} from "../../../utils/messageDisplay";

const CONVERSATION_KEY = ["office", "conversations"];

export default function OfficeMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preferredSessionId = String(searchParams.get("sessionId") || "").trim();
  const [draft, setDraft] = useState("");

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: CONVERSATION_KEY,
    url: endpoints.office.conversations,
    refetchInterval: 15000
  });
  useSocketQueryInvalidation(CONVERSATION_KEY, ["office.message.created", "office.conversation.updated"]);

  const conversations = data?.items || [];
  const selectedId = preferredSessionId || conversations[0]?.sessionId || conversations[0]?.id || "";

  const realtime = useSessionRealtime(selectedId);
  const selectedConversation = useMemo(
    () => conversations.find((item) => String(item.sessionId || item.id) === selectedId) || conversations[0] || null,
    [conversations, selectedId]
  );

  const messages = realtime.messages || [];
  const canCall = Boolean(selectedId && realtime.canStartCall);
  const isVideoCall = realtime.acceptedCallMode === "video" || Boolean(realtime.remoteVideoActive);
  const isActiveCall = ["ringing", "connecting", "reconnecting", "connected"].includes(String(realtime.callState || "").toLowerCase());
  const conversationPreview = getConversationPreviewText(selectedConversation);

  if (isLoading) {
    return (
      <AppShell title="Office Messages" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell title="Office Messages" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load office conversations."} onRetry={() => refetch()} /> : null}

        <OfficePageHeader
          title="Office Messages"
          subtitle="Realtime office communication between visitors, reception, employees, and security."
          tabs={officeTabs}
          actions={[
            <OfficeStatusPill key="status" label={realtime.callState || "idle"} />,
            <OfficeCallActions
              key="calls"
              disabled={!canCall}
              onVoice={() => realtime.startAudioCall()}
              onVideo={() => realtime.startVideoCall()}
            />
          ]}
        />

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.3fr)]">
          <OfficePanel title="Conversations" subtitle="Recent office threads">
            <div className="grid gap-3">
              {conversations.length > 0 ? conversations.map((thread) => {
                const id = String(thread.sessionId || thread.id);
                const isActive = id === selectedId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSearchParams({ sessionId: id })}
                    className={`rounded-[1.4rem] border p-4 text-left transition ${isActive ? "border-brand-500 bg-brand-500/5" : "border-slate-200 bg-slate-50 hover:border-brand-500/25 dark:border-slate-800 dark:bg-slate-950/50"}`}
                  >
                    <OfficeMessageRow message={thread} />
                  </button>
                );
              }) : (
                <OfficeEmptyState title="No conversations" description="Threads will appear once visitors or staff send messages." />
              )}
            </div>
          </OfficePanel>

          <div className="min-w-0 space-y-4">
            {isActiveCall ? (
              isVideoCall ? (
                <OfficeActiveVideoCall
                  title={selectedConversation?.visitorName || "Active Office Video Call"}
                  status={realtime.status || realtime.callState}
                  networkDetail={realtime.networkDetail}
                  localVideoRef={realtime.localVideoRef}
                  remoteVideoRef={realtime.remoteVideoRef}
                  remoteAudioRef={realtime.remoteAudioRef}
                  muted={realtime.muted}
                  speakerOn={realtime.speakerOn}
                  cameraFacing={realtime.cameraFacing}
                  remoteVideoActive={realtime.remoteVideoActive}
                  toggleMute={realtime.toggleMute}
                  toggleSpeaker={realtime.toggleSpeaker}
                  switchCamera={realtime.switchCamera}
                  retryCallConnection={realtime.retryCallConnection}
                  endCall={realtime.endCall}
                />
              ) : (
                <OfficeActiveVoiceCall
                  title={selectedConversation?.visitorName || "Active Office Voice Call"}
                  status={realtime.status || realtime.callState}
                  networkDetail={realtime.networkDetail}
                  muted={realtime.muted}
                  speakerOn={realtime.speakerOn}
                  toggleMute={realtime.toggleMute}
                  toggleSpeaker={realtime.toggleSpeaker}
                  retryCallConnection={realtime.retryCallConnection}
                  endCall={realtime.endCall}
                />
              )
            ) : (
              <OfficeChatSurface
                conversation={selectedConversation}
                messages={messages}
                draft={draft}
                onDraftChange={setDraft}
                onSend={() => {
                  const text = String(draft || "").trim();
                  if (!selectedId || !text) return;
                  realtime.sendMessage(text);
                  setDraft("");
                }}
                sending={realtime.callLaunchStage === "starting" || realtime.callState === "connecting"}
                emptyLabel={selectedId ? "Waiting for the thread to load..." : "Select a conversation to begin."}
              />
            )}

            {selectedConversation ? (
              <OfficePanel title="Conversation Context" subtitle="Current visitor and session status">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContextField label="Visitor" value={selectedConversation.visitorName || selectedConversation.name || "Visitor"} />
                  <ContextField label="Purpose" value={selectedConversation.purpose || "Office visit"} />
                  <ContextField label="Status" value={selectedConversation.status || "pending"} />
                  <ContextField label="Unread" value={String(selectedConversation.unread ?? 0)} />
                  <ContextField
                    label="Latest message"
                    value={conversationPreview || getConversationMessageText(selectedConversation) || "No message text yet."}
                  />
                </div>
              </OfficePanel>
            ) : null}
          </div>
        </section>
      </div>

      <OfficeIncomingCallModal
        open={Boolean(realtime.incomingCall?.pending)}
        hasVideo={Boolean(realtime.incomingCall?.hasVideo)}
        callerLabel={selectedConversation?.visitorName || "Visitor"}
        sourceLabel="office conversation"
        busy={realtime.incomingCall?.phase === "accepting"}
        onAccept={() => realtime.acceptIncomingCall()}
        onReject={() => realtime.rejectIncomingCall()}
      />
    </AppShell>
  );
}

function ContextField({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
