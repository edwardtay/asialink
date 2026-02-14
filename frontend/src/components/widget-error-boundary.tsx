"use client";

import { Component, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackUrl: string;
  fallbackLabel: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[440px] rounded-2xl border border-border bg-card gap-4 px-6">
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            The embedded widget couldn&apos;t load. Use the hosted version instead:
          </p>
          <a
            href={this.props.fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {this.props.fallbackLabel}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
