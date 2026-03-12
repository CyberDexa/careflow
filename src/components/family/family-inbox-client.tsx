"use client"

import { useState, useTransition } from "react"
import { formatDistanceToNow, format } from "date-fns"
import { Send, MessageCircle, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { sendMessageFromFamily } from "@/actions/family"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  body: string
  subject: string | null
  isRead: boolean
  createdAt: Date
  fromFamilyUser: { firstName: string; lastName: string; relationship: string } | null
  fromStaff: { firstName: string; lastName: string } | null
}

interface Props {
  messages: Message[]
  residentId: string
  organisationId: string
  familyUserId: string
}

export default function FamilyInboxClient({ messages, residentId, organisationId, familyUserId }: Props) {
  const [pending, startTransition] = useTransition()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!body.trim()) return
    startTransition(async () => {
      await sendMessageFromFamily({ residentId, organisationId, fromFamilyUserId: familyUserId, body, subject: subject || undefined })
      setSubject("")
      setBody("")
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card className="border border-rose-100">
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-rose-500" />
            Send a message to the care team
          </h3>
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs text-gray-500">Subject (optional)</Label>
            <Input
              id="subject"
              placeholder="e.g. Upcoming visit, Question about care"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body" className="text-xs text-gray-500">Message</Label>
            <Textarea
              id="body"
              placeholder="Type your message here…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
          </div>
          {sent && (
            <p className="text-sm text-green-600 font-medium">Message sent successfully!</p>
          )}
          <Button
            onClick={handleSend}
            disabled={pending || !body.trim()}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {pending ? "Sending…" : "Send message"}
          </Button>
        </CardContent>
      </Card>

      {/* Conversation history */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-rose-500" />
          Conversation
        </h3>
        {messages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No messages yet. Send a message above to start a conversation.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isFromFamily = !!msg.fromFamilyUser
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    isFromFamily ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                      isFromFamily
                        ? "bg-rose-500 text-white rounded-br-sm"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                    )}
                  >
                    {/* Sender */}
                    <div className={cn("flex items-center gap-1 mb-1 text-xs", isFromFamily ? "text-rose-100" : "text-gray-400")}>
                      {isFromFamily ? (
                        <><User className="w-3 h-3" /> You</>
                      ) : (
                        <><Users className="w-3 h-3" /> {msg.fromStaff?.firstName} from the care team</>
                      )}
                    </div>
                    {msg.subject && (
                      <p className={cn("text-xs font-semibold mb-1", isFromFamily ? "text-rose-100" : "text-gray-500")}>
                        {msg.subject}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.body}</p>
                    <p className={cn("text-xs mt-1.5", isFromFamily ? "text-rose-200" : "text-gray-400")}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
