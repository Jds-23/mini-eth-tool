import { fullAbi } from "@/lib/full-abi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import type { AbiItem } from "ox";
import type { Parameter } from "ox/AbiParameters";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

const funcSigSchema = z.string().min(1, "Required");

export default function Encoder() {
	// Step 1: Function signature form
	const sigForm = useForm({
		resolver: zodResolver(z.object({ sig: funcSigSchema })),
		defaultValues: { sig: "" },
		mode: "onChange",
	});
	const sig = useWatch({ control: sigForm.control, name: "sig" });
	const [sigError, setSigError] = useState<string | null>(null);

	const [encoded, setEncoded] = useState<string | null>(null);
	const [usePacked, setUsePacked] = useState(false);
	const [copied, setCopied] = useState(false);
	const copyTimeout = useRef<NodeJS.Timeout | null>(null);
	const [abiItems, setAbiItems] = useState<AbiItem.AbiItem[] | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Parse signature or ABI JSON whenever input changes
	useEffect(() => {
		setSigError(null);
		setEncoded(null);
		setSelectedIndex(0);
		try {
			const parsed = JSON.parse(sig);
			if (Array.isArray(parsed)) {
				setAbiItems(parsed as AbiItem.AbiItem[]);
				return;
			}
			if (typeof parsed === "object" && parsed !== null) {
				setAbiItems([parsed as AbiItem.AbiItem]);
				return;
			}
		} catch {
			// ignore JSON parse errors
		}
		setAbiItems(null);
	}, [sig]);

	// Derive ABI item from signature or ABI JSON
	const abiObj = useMemo<
		| ReturnType<typeof AbiItem.from>
		| Extract<Parameter, { components: readonly Parameter[] }>
		| null
	>(() => {
		if (abiItems) {
			if (!abiItems.length) return null;
			const item = abiItems[Math.min(selectedIndex, abiItems.length - 1)];
			try {
				return item;
			} catch (e) {
				setSigError(e instanceof Error ? e.message : "Invalid ABI item");
				return null;
			}
		}

		if (!sig) return null;
		try {
			return fullAbi.from(sig);
		} catch (e) {
			setSigError(e instanceof Error ? e.message : "Invalid signature");
			return null;
		}
	}, [abiItems, selectedIndex, sig]);

	// Step 2: Dynamic param form
	const paramFields = useMemo(() => {
		if (!abiObj) return [];
		// @ts-expect-error
		return fullAbi.getParameter(abiObj).map(({ name, type }, idx) => ({
			name: name || `arg${idx}`,
			type,
		}));
	}, [abiObj]);

	const paramShape: Record<string, z.ZodType> = {};
	for (const input of paramFields) {
		paramShape[input.name] = z.string().min(1, "Required");
	}
	const paramSchema = z.object(paramShape);
	const paramForm = useForm({
		resolver: zodResolver(paramSchema),
		defaultValues: paramFields.reduce<Record<string, string>>((acc, f) => {
			acc[f.name] = "";
			return acc;
		}, {}),
		mode: "onChange",
	});
	// const paramValues = useWatch({ control: paramForm.control });

	// Encode on submit
	function handleEncode(data: Record<string, string>) {
		if (!abiObj) return;
		try {
			const args = paramFields.map((f) => data[f.name]);
			// @ts-expect-error
			const hex = fullAbi.encode(abiObj, args, { packed: usePacked });
			setEncoded(hex);
		} catch (e) {
			setEncoded("");
			setSigError(e instanceof Error ? e.message : "Encoding error");
		}
	}

	return (
		<div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-lg border-black shadow flex flex-col gap-6">
			<h2 className="text-lg font-bold mb-2">EVM Function Encoder</h2>
			<Form {...sigForm}>
				<form
					className="flex flex-col gap-4"
					onSubmit={sigForm.handleSubmit(() => {})}
				>
					<FormField
						control={sigForm.control}
						name="sig"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea
										{...field}
										className="max-h-[100px] overflow-y-auto"
										placeholder="Paste function signature, e.g. approve(address,uint256)"
										onKeyDown={(e) => {
											if (!field.onChange) return;
											const el = e.target as HTMLTextAreaElement;
											const val = el.value;
											const start = el.selectionStart;
											const end = el.selectionEnd;
											// Only handle single-cursor, not selection
											if (start !== end) return;
											// Map of opening to closing brackets
											const pairs: Record<string, string> = {
												"(": ")",
												"[": "]",
												"{": "}",
											};
											const open = e.key;
											const close = pairs[open];
											if (close) {
												// If next char is already the closing, just move cursor
												if (val[start] === close) {
													setTimeout(() => {
														el.selectionStart = el.selectionEnd = start + 1;
													}, 0);
													e.preventDefault();
													return;
												}
												// Insert closing bracket after cursor
												const newVal =
													val.slice(0, start) + open + close + val.slice(end);
												field.onChange(newVal);
												setTimeout(() => {
													el.selectionStart = el.selectionEnd = start + 1;
												}, 0);
												e.preventDefault();
												return;
											}
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</form>
			</Form>
			{sigError && <div className="text-red-500 text-sm">{sigError}</div>}
			{abiItems && abiItems.length > 1 && (
				<Select onValueChange={(value) => setSelectedIndex(Number(value))}>
					<SelectTrigger className="w-[280px]">
						<SelectValue placeholder="Select a signature" />
					</SelectTrigger>
					<SelectContent>
						{abiItems.map((item, idx) => (
							<SelectItem key={idx} value={idx.toString()}>
								{"type" in item ? item.type : "item"}
								{"name" in item && item.name ? ` ${item.name}` : ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			{abiObj && (
				<Form {...paramForm}>
					<form
						className="flex flex-col gap-4"
						onSubmit={paramForm.handleSubmit(handleEncode)}
					>
						{paramFields.map((field) => (
							<FormField
								key={field.name}
								control={paramForm.control}
								name={field.name}
								render={({ field: f }) => (
									<FormItem>
										<FormControl>
											<Input
												{...f}
												placeholder={`${field.name} (${field.type})`}
												autoComplete="off"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						))}
						{abiObj.type === "tuple" && (
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={usePacked}
									onChange={(e) => setUsePacked(e.target.checked)}
									className="accent-black"
								/>
								Use encodePacked (solidityPacked)
							</label>
						)}
						{(abiObj.type === "function" ||
							abiObj.type === "error" ||
							abiObj.type === "tuple") && (
							<Button type="submit" className="w-fit">
								Encode
							</Button>
						)}
					</form>
				</Form>
			)}
			{encoded &&
				(abiObj?.type === "function" ||
					abiObj?.type === "error" ||
					abiObj?.type === "tuple") && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Input type="text" readOnly value={encoded} className="flex-1" />
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label={copied ? "Copied!" : "Copy to clipboard"}
								onClick={() => {
									if (encoded) {
										navigator.clipboard.writeText(encoded);
										setCopied(true);
										if (copyTimeout.current) clearTimeout(copyTimeout.current);
										copyTimeout.current = setTimeout(
											() => setCopied(false),
											1000,
										);
									}
								}}
							>
								{copied ? (
									<Check className="w-4 h-4" />
								) : (
									<Copy className="w-4 h-4" />
								)}
							</Button>
						</div>
					</div>
				)}
			{/* {abiObj?.type === "event" && (
				<div className="flex flex-col gap-2">
					<div className="text-xs text-muted-foreground">
						Event topic hash (topic0):
					</div>
					<Input type="text" readOnly value={abiObj. || ""} />
				</div>
			)} */}
		</div>
	);
}
