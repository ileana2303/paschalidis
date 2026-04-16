import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import CheckboxComponents from "@/components/template components/form/form-elements/CheckboxComponents";
import DefaultInputs from "@/components/template components/form/form-elements/DefaultInputs";
import DropzoneComponent from "@/components/template components/form/form-elements/DropZone";
import FileInputExample from "@/components/template components/form/form-elements/FileInputExample";
import InputGroup from "@/components/template components/form/form-elements/InputGroup";
import InputStates from "@/components/template components/form/form-elements/InputStates";
import RadioButtons from "@/components/template components/form/form-elements/RadioButtons";
import SelectInputs from "@/components/template components/form/form-elements/SelectInputs";
import TextAreaInput from "@/components/template components/form/form-elements/TextAreaInput";
import ToggleSwitch from "@/components/template components/form/form-elements/ToggleSwitch";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paschalidis Form Elements"
};

export default function FormElements() {
  return (
    <div>
      <PageBreadcrumb pageTitle="From Elements" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DefaultInputs />
          <SelectInputs />
          <TextAreaInput />
          <InputStates />
        </div>
        <div className="space-y-6">
          <InputGroup />
          <FileInputExample />
          <CheckboxComponents />
          <RadioButtons />
          <ToggleSwitch />
          <DropzoneComponent />
        </div>
      </div>
    </div>
  );
}
