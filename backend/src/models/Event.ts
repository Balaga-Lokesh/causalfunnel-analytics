import { Schema, model, type InferSchemaType } from 'mongoose';

export const EVENT_TYPES = ['page_view', 'click'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * One document per tracked interaction.
 *
 * Sessions are not stored separately; they are derived from events with
 * aggregation (group by session_id), which keeps writes to a single insert.
 */
const eventSchema = new Schema(
  {
    session_id: { type: String, required: true },
    event_type: { type: String, enum: EVENT_TYPES, required: true },

    // Normalized URL (origin + pathname) used for grouping and the heatmap selector.
    page_url: { type: String, required: true },
    // Full URL as the browser reported it, including query string / hash.
    full_url: { type: String },

    // Client-side time the event happened.
    timestamp: { type: Date, required: true },

    // Click-only fields. x/y are document coordinates (pageX/pageY), so they
    // stay correct when the page is scrolled.
    x: { type: Number },
    y: { type: Number },

    // Size of the viewport and the full document when the event fired.
    // Used to normalize click positions across different screen sizes.
    viewport_width: { type: Number },
    viewport_height: { type: Number },
    page_width: { type: Number },
    page_height: { type: Number },

    // Optional context about the clicked element (e.g. "button#buy").
    target: { type: String },

    referrer: { type: String },
    user_agent: { type: String },
  },
  {
    timestamps: { createdAt: 'received_at', updatedAt: false },
    versionKey: false,
  },
);

// User journey: all events of a session in order.
eventSchema.index({ session_id: 1, timestamp: 1 });
// Heatmap: all clicks for a page.
eventSchema.index({ page_url: 1, event_type: 1 });
// Session list sorted by recency.
eventSchema.index({ timestamp: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const Event = model('Event', eventSchema);
