import { fullAbi } from "@/lib/full-abi";
import { useSignatureLookup } from "@/lib/hooks/useSignatureLookup";
import { zodResolver } from "@hookform/resolvers/zod";
import { AbiFunction, type AbiItem } from "ox";
import type { Parameter } from "ox/AbiParameters";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const sigSchema = z.string().min(1, "Required");
const hexSchema = z.string().min(1, "Required");

export default function Decoder() {
	const sigForm = useForm({
		resolver: zodResolver(z.object({ sig: sigSchema, hex: hexSchema })),
		defaultValues: { sig: "", hex: "" },
		mode: "onChange",
	});
	const sig = useWatch({ control: sigForm.control, name: "sig" });
	const hex = useWatch({ control: sigForm.control, name: "hex" });
	const [sigError, setSigError] = useState<string | null>(null);
	const [decodeError, setDecodeError] = useState<string | null>(null);
	const [decoded, setDecoded] = useState<unknown[] | null>(null);

	// Extract function selector (first 10 chars)
	let selector = "";
	if (hex && /^0x[0-9a-fA-F]+$/.test(hex)) {
		if (hex.length >= 10) selector = hex.slice(0, 10);
	}

	// Only lookup if no signature entered and selector present
	const { data: sigData, isLoading: isLookupLoading } = useSignatureLookup({
		functionHashes: selector ? [selector] : [],
	});

	// If user picks a fetched signature, set it in the form
	function handlePickSignature(s: string) {
		sigForm.setValue("sig", s);
	}

	// Determine which signature to use for decoding
	const effectiveSig =
		sig ||
		(sigData?.result.function &&
			Object.values(sigData.result.function).flat()[0]?.name) ||
		"";

	// Parse signature (function, error, or tuple)
	type AbiObj =
		| ReturnType<typeof AbiItem.from>
		| Extract<Parameter, { components: readonly Parameter[] }>
		| null;

	const abiObj = useMemo<
		| ReturnType<typeof AbiItem.from>
		| Extract<Parameter, { components: readonly Parameter[] }>
		| null
	>(() => {
		setSigError(null);
		if (!effectiveSig) return null;
		try {
			const parsed = JSON.parse(effectiveSig);
			if (Array.isArray(parsed)) {
				// If user provided a selector, try to find by selector, else by name
				if (selector) {
					// Find function by selector
					const fn = AbiFunction.fromAbi(parsed, selector);
					if (fn) return fn;
				}
				// Otherwise, use the first function
				const fn = AbiFunction.fromAbi(
					parsed,
					parsed.find((x) => x.type === "function")?.name || "",
				);
				if (fn) return fn;
				setSigError("No function found in ABI array");
				return null;
			}
			if (typeof parsed === "object" && parsed !== null) {
				if (parsed.type === "function") return AbiFunction.from(parsed);
				setSigError("ABI object must be function");
				return null;
			}
		} catch (e) {
			// Not JSON, fallback to string parsing
		}

		try {
			return fullAbi.from(effectiveSig);
		} catch (e) {
			setSigError(e instanceof Error ? e.message : "Invalid signature");
			return null;
		}
	}, [effectiveSig, selector]);

	// Type guards
	function isAbiFunction(obj: AbiObj) {
		return !!obj && "type" in obj && obj.type === "function";
	}
	function isAbiError(obj: AbiObj) {
		return !!obj && "type" in obj && obj.type === "error";
	}

	function isTupleObj(obj: AbiObj) {
		console.log(!!obj && "components" in obj);
		return !!obj && "components" in obj;
	}

	// Param fields for display
	const paramFields = useMemo(() => {
		if (!abiObj) return [];
		// @ts-expect-error
		return fullAbi.getParameter(abiObj).map(({ name, type }, idx) => ({
			name: name || `arg${idx}`,
			type,
		}));
	}, [abiObj]);

	// Decoding logic
	function handleDecode() {
		setDecodeError(null);
		setDecoded(null);
		if (!abiObj) return;
		// Ensure hex is a valid 0x-prefixed string
		const hexVal = (hex || "").trim();
		if (hexVal.length < 10) {
			setDecodeError(
				"Hex must be at least 10 characters (0x + 8 hex chars) for function selector",
			);
			return;
		}
		if (!/^0x[0-9a-fA-F]+$/.test(hexVal)) {
			setDecodeError("Hex must be a 0x-prefixed hex string");
			return;
		}
		const hexTyped = hexVal as `0x${string}`;
		try {
			// @ts-expect-error
			const values: unknown[] = fullAbi.decode(abiObj, hexTyped);

			setDecoded(values);
		} catch (e: unknown) {
			setDecodeError(e instanceof Error ? e.message : "Decoding error");
		}
	}

	return (
		<div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-lg border-black shadow flex flex-col gap-6">
			<h2 className="text-lg font-bold mb-2">EVM Decoder</h2>
			<Form {...sigForm}>
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						handleDecode();
					}}
				>
					<FormField
						control={sigForm.control}
						name="hex"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										{...field}
										placeholder="Hex data to decode (0x...)"
										autoComplete="off"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{/* Signature lookup UI */}
					{!sig && selector.length === 10 && (
						<>
							{isLookupLoading && (
								<div className="text-sm text-muted-foreground">
									Looking up possible signatures...
								</div>
							)}
							{sigData?.result.function && (
								<div className="flex flex-col gap-2">
									<div className="text-xs text-muted-foreground">
										Possible signatures from selector:
									</div>
									{Object.values(sigData.result.function)
										.flat()
										.filter((item) => item?.name)
										.map(
											(item, idx) =>
												item && (
													<button
														key={idx}
														className="text-xs text-blue-600 underline text-left hover:text-blue-800"
														type="button"
														onClick={() => handlePickSignature(item.name)}
													>
														{item?.name}
													</button>
												),
										)}
								</div>
							)}
						</>
					)}
					<FormField
						control={sigForm.control}
						name="sig"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Signature: approve(address,uint) or (uint,address) or ABI"
										className="max-h-48 overflow-auto"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" className="w-fit">
						Decode
					</Button>
				</form>
			</Form>

			{decodeError && <div className="text-red-500 text-sm">{decodeError}</div>}
			{sigError && <div className="text-red-500 text-sm">{sigError}</div>}
			{abiObj && (
				<div className="flex flex-col gap-2">
					<div className="text-xs text-muted-foreground">
						<span className="font-mono text-black">
							{isAbiFunction(abiObj) || isAbiError(abiObj)
								? `${abiObj.name}(${abiObj.inputs?.map((i) => i.type).join(",") || ""})`
								: isTupleObj(abiObj)
									? `(${abiObj.components?.map((i) => i.type).join(",") || ""})`
									: ""}
						</span>
					</div>
				</div>
			)}
			{decoded && paramFields.length > 0 && (
				<div className="flex flex-col gap-2">
					{paramFields.map((field, idx) => (
						<div key={field.name} className="flex gap-2 items-center">
							<span className="text-xs text-muted-foreground w-32">
								{field.name} ({field.type}):
							</span>
							<Input
								type="text"
								readOnly
								value={decoded[idx]?.toString?.() ?? ""}
								className="flex-1"
							/>
						</div>
					))}
				</div>
			)}
			{decoded && paramFields.length === 0 && (
				<div className="flex flex-col gap-2">
					{decoded.map((val, idx) => (
						<div key={idx} className="flex gap-2 items-center">
							<span className="text-xs text-muted-foreground w-32">
								arg{idx}:
							</span>
							<Input
								type="text"
								readOnly
								value={val?.toString?.() ?? ""}
								className="flex-1"
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
