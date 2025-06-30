import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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

type OperandBase = "dec" | "hex" | "bin";

let operandBaseForValidation: OperandBase = "dec";

const baseRegex: Record<OperandBase, RegExp> = {
	dec: /^\d*$/,
	hex: /^[0-9a-fA-F]*$/,
	bin: /^[01]*$/,
};

const formSchema = z.object({
	binary: z
		.string()
		.regex(/^[01]*$/, { message: "Binary must be 0 or 1 only" })
		.optional()
		.or(z.literal("")),
	decimal: z
		.string()
		.regex(/^\d*$/, { message: "Decimal must be digits only" })
		.optional()
		.or(z.literal("")),
	hex: z
		.string()
		.regex(/^[0-9a-fA-F]*$/, { message: "Hex must be 0-9 or A-F" })
		.optional()
		.or(z.literal("")),
	operand: z
		.string()
		.refine((val) => baseRegex[operandBaseForValidation].test(val), {
			message: "Invalid operand for selected base",
		})
		.optional()
		.or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const Calculator = () => {
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			binary: "",
			decimal: "",
			hex: "",
			operand: "",
		},
		mode: "onChange",
	});

	const { watch, setValue, reset } = form;
	const binary = watch("binary") ?? "";
	const decimal = watch("decimal") ?? "";
	const hex = watch("hex") ?? "";
	const operand = watch("operand") ?? "";

	const [operandBase, setOperandBase] = useState<OperandBase>("dec");

	useEffect(() => {
		operandBaseForValidation = operandBase;
		void form.trigger("operand");
	}, [operandBase, form]);

	type Op =
		| "shiftLeft"
		| "shiftRight"
		| "add"
		| "sub"
		| "or"
		| "xor"
		| "and"
		| "mult"
		| "div"
		| "mod"
		| "not";
	const [operation, setOperation] = useState<Op>("add");

	// Track which field was last changed
	const lastChanged = useRef<"binary" | "decimal" | "hex" | null>(null);

	// Synchronize fields based on last changed
	useEffect(() => {
		if (lastChanged.current === "binary") {
			if (binary === "") {
				setValue("decimal", "");
				setValue("hex", "");
			} else {
				const dec = Number.parseInt(binary, 2);
				if (!Number.isNaN(dec)) {
					setValue("decimal", dec.toString(10), { shouldTouch: false });
					setValue("hex", dec.toString(16).toUpperCase(), {
						shouldTouch: false,
					});
				}
			}
		} else if (lastChanged.current === "decimal") {
			if (decimal === "") {
				setValue("binary", "");
				setValue("hex", "");
			} else {
				const dec = Number.parseInt(decimal, 10);
				if (!Number.isNaN(dec)) {
					setValue("binary", dec.toString(2), { shouldTouch: false });
					setValue("hex", dec.toString(16).toUpperCase(), {
						shouldTouch: false,
					});
				}
			}
		} else if (lastChanged.current === "hex") {
			if (hex === "") {
				setValue("binary", "");
				setValue("decimal", "");
			} else {
				const dec = Number.parseInt(hex, 16);
				if (!Number.isNaN(dec)) {
					setValue("decimal", dec.toString(10), { shouldTouch: false });
					setValue("binary", dec.toString(2), { shouldTouch: false });
				}
			}
		}
	}, [binary, decimal, hex, setValue]);

	const handleClear = () => {
		reset();
		lastChanged.current = null;
	};

	const handleOperate = () => {
		const dec = Number.parseInt(decimal || "0", 10);
		let opVal = 0;
		if (operation !== "not") {
			switch (operandBase) {
				case "hex":
					opVal = Number.parseInt(operand || "0", 16);
					break;
				case "bin":
					opVal = Number.parseInt(operand || "0", 2);
					break;
				default:
					opVal = Number.parseInt(operand || "0", 10);
			}
			if (Number.isNaN(opVal)) return;
		}
		if (Number.isNaN(dec)) return;
		let result = dec;
		switch (operation) {
			case "shiftLeft":
				result = dec << opVal;
				break;
			case "shiftRight":
				result = dec >> opVal;
				break;
			case "add":
				result = dec + opVal;
				break;
			case "sub":
				result = dec - opVal;
				break;
			case "or":
				result = dec | opVal;
				break;
			case "xor":
				result = dec ^ opVal;
				break;
			case "and":
				result = dec & opVal;
				break;
			case "mult":
				result = dec * opVal;
				break;
			case "div":
				if (opVal === 0) return;
				result = Math.trunc(dec / opVal);
				break;
			case "mod":
				if (opVal === 0) return;
				result = dec % opVal;
				break;
			case "not":
				result = ~dec;
				break;
		}
		setValue("decimal", result.toString(10));
		lastChanged.current = "decimal";
	};

	// Helper functions for formatting
	function formatDecimal(val: string) {
		if (!val) return "";
		return val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	function unformatDecimal(val: string) {
		return val.replace(/,/g, "");
	}
	function formatBinary(val: string) {
		if (!val) return "";
		return val.replace(/(.{4})/g, "$1_").replace(/_+$/, "");
	}

	function unformatBinary(val: string) {
		return val.replace(/_/g, "");
	}

	function formatHex(val: string) {
		if (!val) return "";
		return val.replace(/(.{2})/g, "$1_").replace(/_+$/, "");
	}

	function unformatHex(val: string) {
		return val.replace(/_/g, "");
	}

	function sanitizeOperand(val: string, base: OperandBase) {
		switch (base) {
			case "hex":
				return val.replace(/[^0-9a-fA-F]/g, "");
			case "bin":
				return val.replace(/[^01]/g, "");
			default:
				return val.replace(/\D/g, "");
		}
	}

	return (
		<div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-sm border-black shadow flex flex-col gap-6">
			<h2 className="text-lg font-bold mb-2">
				Binary / Decimal / Hex Calculator
			</h2>
			<Form {...form}>
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => e.preventDefault()}
				>
					<FormField
						control={form.control}
						name="binary"
						render={({ field }) => {
							const displayValue = formatBinary(field.value ?? "");
							return (
								<FormItem>
									{/* <FormLabel>Binary</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Binary. e.g. 1010"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "binary";
												// Show unformatted value on focus
												field.onChange(unformatBinary(field.value ?? ""));
												e.target.value = unformatBinary(field.value ?? "");
											}}
											onBlur={(e) => {
												// On blur, format value
												field.onChange(unformatBinary(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatBinary(e.target.value ?? "");
												field.onChange(raw);
												lastChanged.current = "binary";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="decimal"
						render={({ field }) => {
							const displayValue = formatDecimal(field.value ?? "");
							return (
								<FormItem>
									{/* <FormLabel>Decimal</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Decimal. e.g. 10"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "decimal";
												field.onChange(unformatDecimal(field.value ?? ""));
												e.target.value = unformatDecimal(field.value ?? "");
											}}
											onBlur={(e) => {
												field.onChange(unformatDecimal(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatDecimal(e.target.value ?? "");
												field.onChange(raw);
												lastChanged.current = "decimal";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="hex"
						render={({ field }) => {
							const displayValue = formatHex((field.value ?? "").toUpperCase());
							return (
								<FormItem>
									{/* <FormLabel>Hexadecimal</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Hexadecimal. e.g. A"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "hex";
												field.onChange(unformatHex(field.value ?? ""));
												e.target.value = unformatHex(field.value ?? "");
											}}
											onBlur={(e) => {
												field.onChange(unformatHex(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatHex(
													e.target.value ?? "",
												).toUpperCase();
												field.onChange(raw);
												lastChanged.current = "hex";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="operand"
						rules={{
							validate: (val: string) =>
								baseRegex[operandBase].test(val) ||
								`Invalid ${operandBase} value`,
						}}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormControl>
										<Input
											{...field}
											placeholder="Operand"
											autoComplete="off"
											onChange={(e) => {
												const clean = sanitizeOperand(
													e.target.value,
													operandBase,
												);
												field.onChange(clean);
											}}
										/>
									</FormControl>
									<Select
										value={operandBase}
										onValueChange={(val) => setOperandBase(val as OperandBase)}
									>
										<SelectTrigger className="w-[80px]">
											<SelectValue placeholder="dec" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="dec">dec</SelectItem>
											<SelectItem value="hex">hex</SelectItem>
											<SelectItem value="bin">bin</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex gap-2">
						<Select
							value={operation}
							onValueChange={(val) => setOperation(val as Op)}
						>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="Operation" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="add">Add</SelectItem>
								<SelectItem value="sub">Sub</SelectItem>
								<SelectItem value="mult">Mult</SelectItem>
								<SelectItem value="div">Div</SelectItem>
								<SelectItem value="mod">Modulo</SelectItem>
								<SelectItem value="or">OR</SelectItem>
								<SelectItem value="and">AND</SelectItem>
								<SelectItem value="xor">XOR</SelectItem>
								<SelectItem value="not">NOT</SelectItem>
								<SelectItem value="shiftLeft">Shift Left</SelectItem>
								<SelectItem value="shiftRight">Shift Right</SelectItem>
							</SelectContent>
						</Select>
						<Button type="button" onClick={handleOperate}>
							Execute
						</Button>
						<Button type="button" variant="outline" onClick={handleClear}>
							Clear
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default Calculator;
