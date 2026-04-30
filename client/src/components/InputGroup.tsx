import { Button } from "../../components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field"
import { Input } from "../../components/ui/input"

export function InputFieldgroup() {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="fieldgroup-email">Email</FieldLabel>
        <Input
          id="fieldgroup-email"
          type="email"
          placeholder="name@example.com"
        />
        {/* <FieldDescription>
          We&apos;ll send updates to this address.
        </FieldDescription> */}
      </Field>
      <Field>
        <FieldLabel htmlFor="fieldgroup-name">Mot de passe</FieldLabel>
        <Input id="fieldgroup-name" type="passsword" placeholder="**********"/>
      </Field>
      <Field orientation="horizontal">
        <Button type="reset" variant="outline">
          Reset
        </Button>
        <Button type="submit">Soumettre</Button>
      </Field>
    </FieldGroup>
  )
}
