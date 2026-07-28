export interface UserMessageBubbleProps {
  question: string;
}

export function UserMessageBubble({ question }: UserMessageBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-hover px-4 py-2.5 sm:max-w-[75%]">
        <p className="whitespace-pre-wrap font-ui text-[14px] leading-[21px] text-primary">{question}</p>
      </div>
    </div>
  );
}
