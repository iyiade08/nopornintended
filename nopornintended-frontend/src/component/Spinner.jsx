import { ClipLoader } from "react-spinners";

const Spinner = ({ loading }) => {
  return (
    <div className="flex items-center justify-center py-8">
      <ClipLoader color="#4338ca" loading={loading} size={40} />
    </div>
  );
};

export default Spinner;
