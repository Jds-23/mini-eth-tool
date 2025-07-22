import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"border-white/30 placeholder:text-gray-400 focus-visible:border-white focus-visible:ring-white/20 aria-invalid:ring-destructive/20 aria-invalid:border-destructive bg-white/10 flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base text-white shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
