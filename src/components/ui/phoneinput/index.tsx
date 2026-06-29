import * as React from "react";

import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_PHONE_COUNTRY, SUPPORTED_PHONE_COUNTRIES } from "@/lib/phone";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PhoneNumberInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    label?: string;
    error?: boolean;
    onChange?: (value: RPNInput.Value) => void;
  };

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

// ─── InputWithPrefix ──────────────────────────────────────────────────────────
// Defined at module level so its reference is always stable.
// callingCode is passed via a context ref — no remount, no focus loss, no lag.

const CallingCodeContext = React.createContext("");

const InputWithPrefix = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ value: inputValue, className, ...inputProps }, inputRef) => {
  const callingCode = React.useContext(CallingCodeContext);
  const stringValue = Array.isArray(inputValue)
    ? inputValue[0] || ""
    : inputValue;

  return (
    <div className="flex flex-1 items-center">
      <span className="pointer-events-none select-none whitespace-nowrap pl-3 text-sm font-medium text-gray-700">
        {callingCode}
      </span>
      <input
        className={cn(
          "h-11 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        value={stringValue}
        {...inputProps}
        ref={inputRef}
      />
    </div>
  );
});
InputWithPrefix.displayName = "PhoneNumberInputWithPrefix";

// ─── PhoneNumberInput ─────────────────────────────────────────────────────────

export const PhoneNumberInput: React.ForwardRefExoticComponent<PhoneNumberInputProps> =
  React.forwardRef<
    React.ElementRef<typeof RPNInput.default>,
    PhoneNumberInputProps
  >(({ className, onChange, value, label, error, ...props }, ref) => {
    const [selectedCountry, setSelectedCountry] =
      React.useState<RPNInput.Country>(DEFAULT_PHONE_COUNTRY);

    const callingCode = React.useMemo(() => {
      try {
        return `+${getCountryCallingCode(selectedCountry)}`;
      } catch {
        return "+93";
      }
    }, [selectedCountry]);

    const CountrySelectWithTracking = React.useCallback(
      (selectProps: CountrySelectProps) => (
        <CountrySelect
          {...selectProps}
          onChange={(country) => {
            setSelectedCountry(country);
            selectProps.onChange(country);
          }}
        />
      ),
      [],
    );

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <div className="mb-1.5">
            <Label>{label}</Label>
          </div>
        )}
        <div className="h-12 w-full min-w-0 rounded-xl border border-input focus-ring-ring px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40">
          {/* CallingCodeContext passes the code into InputWithPrefix
                without changing its component reference */}
          <CallingCodeContext.Provider value={callingCode}>
            <RPNInput.default
              ref={ref}
              className="flex h-full w-full"
              flagComponent={FlagComponent}
              countrySelectComponent={CountrySelectWithTracking}
              inputComponent={InputWithPrefix}
              smartCaret={false}
              international={false}
              countries={SUPPORTED_PHONE_COUNTRIES}
              defaultCountry={DEFAULT_PHONE_COUNTRY}
              value={value || undefined}
              onChange={(val) => onChange?.(val || ("" as RPNInput.Value))}
              onCountryChange={(country) => {
                if (country) setSelectedCountry(country);
              }}
              {...props}
            />
          </CallingCodeContext.Provider>
        </div>
      </div>
    );
  });

PhoneNumberInput.displayName = "PhoneNumberInput";

// ─── CountrySelect ────────────────────────────────────────────────────────────

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-full items-center gap-1.5 border-r border-gray-200 bg-transparent px-3 text-sm outline-none hover:bg-gray-50 disabled:opacity-50"
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown className="size-3.5 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                const viewport = scrollAreaRef.current?.querySelector(
                  "[data-radix-scroll-area-viewport]",
                );
                if (viewport) viewport.scrollTop = 0;
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── CountrySelectOption ──────────────────────────────────────────────────────

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => (
  <CommandItem
    className="gap-2"
    onSelect={() => {
      onChange(country);
      onSelectComplete();
    }}
  >
    <FlagComponent country={country} countryName={countryName} />
    <span className="flex-1 text-sm">{countryName}</span>
    <span className="text-sm text-foreground/50">
      {`+${RPNInput.getCountryCallingCode(country)}`}
    </span>
    <CheckIcon
      className={cn(
        "ml-auto size-4",
        country === selectedCountry ? "opacity-100" : "opacity-0",
      )}
    />
  </CommandItem>
);

// ─── FlagComponent ────────────────────────────────────────────────────────────

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];
  return (
    <span className="flex h-5 w-5 overflow-hidden rounded-full bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};
