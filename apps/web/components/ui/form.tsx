import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import { useTranslations } from "next-intl"
import * as React from "react"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const Form = FormProvider

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  const values = React.useMemo(() => ({ name: props.name }), [props.name])

  return (
    <FormFieldContext.Provider value={values}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

interface FormItemContextValue {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

const FormItem = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.RefObject<HTMLDivElement>
}) => {
  const id = React.useId()

  const values = React.useMemo(() => ({ id }), [id])

  return (
    <FormItemContext.Provider value={values}>
      <div ref={ref} className={cn("space-y-0.5", className)} {...props} />
    </FormItemContext.Provider>
  )
}
FormItem.displayName = "FormItem"

const FormLabel = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  ref?: React.RefObject<React.ComponentRef<typeof LabelPrimitive.Root>>
}) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(
        error && "text-red-500 dark:text-dark-card-discard",
        className,
      )}
      htmlFor={formItemId}
      {...props}
    />
  )
}
FormLabel.displayName = "FormLabel"

const FormControl = ({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Slot> & {
  ref?: React.RefObject<React.ComponentRef<typeof Slot>>
}) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}
FormControl.displayName = "FormControl"

const FormDescription = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement>
}) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-gray-600 dark:text-dark-font", className)}
      {...props}
    />
  )
}
FormDescription.displayName = "FormDescription"

const FormMessage = ({
  ref,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.RefObject<HTMLParagraphElement>
}) => {
  const { error, formMessageId } = useFormField()
  const t = useTranslations("errors")
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  // biome-ignore lint/suspicious/noExplicitAny: body can be anything
  let errorMessage = t(body as any)

  if (`errors.${body}` === errorMessage) {
    errorMessage = `Untranslated error: ${body}`
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "text-sm text-red-600 dark:text-dark-card-discard",
        className,
      )}
      {...props}
    >
      {errorMessage}
    </p>
  )
}
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
