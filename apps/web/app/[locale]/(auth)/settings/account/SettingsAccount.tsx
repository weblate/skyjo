"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  type UpdateEmail,
  type UpdateUsername,
  updateEmailSchema,
  updateUsernameSchema,
} from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UsernameInput } from "@/components/ui/username-input"
import { useAuth } from "@/hooks/useAuth"
import { useSettingsApi } from "../useSettingsApi"
import { DeleteAccount } from "./DeleteAccount"

export function SettingsAccount() {
  const tAccount = useTranslations("pages.SettingsAccount")
  const { user } = useAuth()
  const { loading, updateUsername, updateEmail } = useSettingsApi()

  const usernameForm = useForm<UpdateUsername>({
    resolver: zodResolver(updateUsernameSchema),
    defaultValues: {
      username: "",
    },
  })

  const emailForm = useForm<UpdateEmail>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email: "",
    },
  })

  useEffect(() => {
    if (user) {
      usernameForm.reset({
        username: user.username,
      })
      emailForm.reset({
        email: user.email,
      })
    }
  }, [user, usernameForm, emailForm])

  const handleUpdateUsername = async (data: UpdateUsername) => {
    const error = await updateUsername(data)

    if (error) {
      usernameForm.setError("username", {
        message: error,
      })
    }
  }

  const handleUpdateEmail = async (data: UpdateEmail) => {
    const error = await updateEmail(data)

    if (error) {
      emailForm.setError("email", {
        message: error,
      })
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Form {...usernameForm}>
          <form
            onSubmit={usernameForm.handleSubmit(handleUpdateUsername)}
            className="space-y-4"
          >
            <FormField
              control={usernameForm.control}
              name="username"
              render={({ field }) => (
                <UsernameInput
                  field={field}
                  label={tAccount("fields.username.label")}
                  description={tAccount("fields.username.description")}
                  placeholder={tAccount("fields.username.placeholder")}
                />
              )}
            />
            <Button
              type="submit"
              loading={loading === "username"}
              disabled={
                !usernameForm.formState.isDirty ||
                user.username === usernameForm.getValues("username")
              }
            >
              {tAccount("fields.username.submit")}
            </Button>
          </form>
        </Form>
      </div>

      <Form {...emailForm}>
        <form
          onSubmit={emailForm.handleSubmit(handleUpdateEmail)}
          className="space-y-5"
        >
          <div className="space-y-1">
            <Label htmlFor="email">{tAccount("fields.email.label")}</Label>
            <FormDescription>
              {tAccount("fields.email.description")}
            </FormDescription>
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={tAccount("fields.email.placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            loading={loading === "email"}
            disabled={
              !emailForm.formState.isDirty || !emailForm.formState.isValid
            }
          >
            {tAccount("fields.email.submit")}
          </Button>
        </form>
      </Form>

      <Separator />
      <DeleteAccount />
    </div>
  )
}
