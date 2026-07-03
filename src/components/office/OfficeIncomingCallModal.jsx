import VisitorIncomingCallModal from "../VisitorIncomingCallModal";

export default function OfficeIncomingCallModal(props) {
  return (
    <VisitorIncomingCallModal
      {...props}
      callerLabel={props?.callerLabel || "Office"}
      sourceLabel={props?.sourceLabel || "office dashboard"}
    />
  );
}
